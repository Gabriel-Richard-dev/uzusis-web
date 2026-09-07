package br.ifce.uzusis.order.pedido;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.money.Money;
import br.ifce.uzusis.common.outbox.OutboxPublisher;
import br.ifce.uzusis.order.carrinho.CarrinhoRepository;
import br.ifce.uzusis.order.carrinho.ItemCarrinho;
import br.ifce.uzusis.order.pedido.PedidoDtos.ItemResposta;
import br.ifce.uzusis.order.pedido.PedidoDtos.PedidoResposta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.function.Consumer;

import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;

/**
 * Orquestrador da saga de compra. Recebe as respostas do catálogo e do
 * pagamento, decide pelo estado final e publica o desfecho.
 */
@Service
public class PedidoService {

    private static final Logger log = LoggerFactory.getLogger(PedidoService.class);
    private static final String AGREGADO = "Pedido";

    private final PedidoRepository pedidos;
    private final ItemPedidoRepository itens;
    private final CarrinhoRepository carrinhos;
    private final OutboxPublisher outbox;

    public PedidoService(PedidoRepository pedidos, ItemPedidoRepository itens,
                         CarrinhoRepository carrinhos, OutboxPublisher outbox) {
        this.pedidos = pedidos;
        this.itens = itens;
        this.carrinhos = carrinhos;
        this.outbox = outbox;
    }

    /**
     * Fecha o carrinho: cria o pedido em CRIADO e publica order.created na
     * mesma transação, via outbox. O carrinho é esvaziado aqui — se algo falhar
     * depois, o rollback devolve o carrinho junto.
     */
    @Transactional
    public PedidoResposta finalizarCompra(String clienteSub, String clienteEmail) {
        var carrinho = carrinhos.findByClienteSub(clienteSub)
                .orElseThrow(() -> new ResponseStatusException(UNPROCESSABLE_ENTITY, "Carrinho vazio"));

        if (carrinho.getItens().isEmpty()) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Carrinho vazio");
        }

        var pedido = new Pedido(clienteSub, clienteEmail);
        carrinho.getItens().forEach(item -> pedido.adicionarItem(
                item.getProdutoId(), item.getTamanhoId(), item.getSigla(),
                item.getQuantidade(), item.getValorUnitario()));

        pedidos.saveAndFlush(pedido);

        outbox.publicar(AGREGADO, String.valueOf(pedido.getId()), Topics.ORDER_CREATED,
                new Events.OrderCreated(
                        pedido.getId(),
                        clienteSub,
                        clienteEmail,
                        Money.paraCentavos(pedido.getValorTotal()),
                        carrinho.getItens().stream().map(PedidoService::paraItemDeEvento).toList()));

        carrinho.esvaziar();
        log.info("Pedido {} criado para o cliente {}", pedido.getId(), clienteSub);
        return PedidoResposta.de(pedido);
    }

    @Transactional
    public void aoResponderEstoque(long orderId, boolean reservado, String motivo) {
        aplicar(orderId, pedido -> pedido.registrarEstoque(reservado, motivo));
    }

    @Transactional
    public void aoResponderPagamento(long orderId, boolean confirmado, String paymentIntentId, String motivo) {
        aplicar(orderId, pedido -> pedido.registrarPagamento(confirmado, paymentIntentId, motivo));
    }

    private void aplicar(long orderId, Consumer<Pedido> resposta) {
        var pedido = pedidos.travarPorId(orderId)
                .orElseThrow(() -> new IllegalStateException("Evento para pedido inexistente: " + orderId));

        resposta.accept(pedido);

        var desfecho = pedido.avaliar();
        var chave = String.valueOf(orderId);

        switch (desfecho) {
            case PAGAR -> {
                pedido.pagar();
                outbox.publicar(AGREGADO, chave, Topics.ORDER_PAID, new Events.OrderPaid(
                        orderId, pedido.getClienteSub(), pedido.getClienteEmail(),
                        Money.paraCentavos(pedido.getValorTotal())));
                log.info("Pedido {} pago", orderId);
            }
            case CANCELAR -> {
                pedido.cancelar(null);
                publicarCancelamento(pedido, chave);
            }
            case CANCELAR_COM_ESTORNO -> {
                pedido.cancelar(null);
                // Primeiro o estorno: o dinheiro do cliente é o que não pode
                // ficar parado se o resto falhar.
                outbox.publicar(AGREGADO, chave, Topics.ORDER_REFUND_REQUESTED, new Events.RefundRequested(
                        orderId, pedido.getPaymentIntentId(), pedido.getMotivoCancelamento()));
                publicarCancelamento(pedido, chave);
                log.warn("Pedido {} pago mas sem estoque: estorno pedido para o intent {}",
                        orderId, pedido.getPaymentIntentId());
            }
            case PENDENTE -> log.debug("Pedido {} continua aguardando resposta", orderId);
        }
    }

    private void publicarCancelamento(Pedido pedido, String chave) {
        outbox.publicar(AGREGADO, chave, Topics.ORDER_CANCELLED, new Events.OrderCancelled(
                pedido.getId(), pedido.getClienteSub(), pedido.getClienteEmail(),
                pedido.getMotivoCancelamento()));
        log.info("Pedido {} cancelado: {}", pedido.getId(), pedido.getMotivoCancelamento());
    }

    @Transactional(readOnly = true)
    public List<PedidoResposta> meusPedidos(String clienteSub) {
        return pedidos.findByClienteSubOrderByCriadoEmDesc(clienteSub).stream()
                .map(PedidoResposta::de)
                .toList();
    }

    /** Histórico: o que já chegou na mão do cliente. */
    @Transactional(readOnly = true)
    public List<ItemResposta> historico(String clienteSub) {
        return itensDoCliente(clienteSub, true);
    }

    /** Em andamento: o que ainda não chegou. */
    @Transactional(readOnly = true)
    public List<ItemResposta> emAndamento(String clienteSub) {
        return itensDoCliente(clienteSub, false);
    }

    private List<ItemResposta> itensDoCliente(String clienteSub, boolean recebido) {
        return pedidos.findByClienteSubOrderByCriadoEmDesc(clienteSub).stream()
                .flatMap(pedido -> pedido.getItens().stream())
                .filter(item -> item.isRecebido() == recebido)
                .map(ItemResposta::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ItemResposta> itensPorEnvio(boolean enviados) {
        return itens.findByEnviado(enviados).stream().map(ItemResposta::de).toList();
    }

    @Transactional
    public ItemResposta enviarItem(long itemId) {
        var item = itens.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Item não encontrado"));
        item.marcarEnviado();
        return ItemResposta.de(item);
    }

    @Transactional
    public ItemResposta receberItem(String clienteSub, long itemId) {
        var item = itens.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Item não encontrado"));

        if (!item.getPedido().getClienteSub().equals(clienteSub)) {
            // 404 e não 403: quem não é dono do item não precisa saber que ele existe.
            throw new ResponseStatusException(NOT_FOUND, "Item não encontrado");
        }
        if (!item.isEnviado()) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Produto ainda não foi enviado");
        }

        item.marcarRecebido();
        return ItemResposta.de(item);
    }

    private static Events.Item paraItemDeEvento(ItemCarrinho item) {
        return new Events.Item(item.getProdutoId(), item.getTamanhoId(), item.getSigla(),
                item.getQuantidade(), Money.paraCentavos(item.getValorUnitario()));
    }
}
