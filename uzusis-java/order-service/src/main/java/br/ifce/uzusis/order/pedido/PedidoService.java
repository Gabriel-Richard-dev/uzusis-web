package br.ifce.uzusis.order.pedido;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.money.Money;
import br.ifce.uzusis.common.outbox.OutboxPublisher;
import br.ifce.uzusis.order.carrinho.CarrinhoRepository;
import br.ifce.uzusis.order.catalogo.CatalogoClient;
import br.ifce.uzusis.order.catalogo.ProdutoResumo;
import br.ifce.uzusis.order.pedido.PedidoDtos.PedidoResposta;
import br.ifce.uzusis.order.pedido.PedidoDtos.Resumo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
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
    private static final Set<StatusPedido> STATUS_ADMIN = EnumSet.of(StatusPedido.PAGO, StatusPedido.ENVIADO, StatusPedido.RECEBIDO);
    private static final Set<String> ORDENACOES_ADMIN = Set.of("pagoEm", "enviadoEm", "criadoEm");

    private final PedidoRepository pedidos;
    private final CarrinhoRepository carrinhos;
    private final CatalogoClient catalogo;
    private final FreteService frete;
    private final OutboxPublisher outbox;
    private final Clock relogio;
    private final int expiracaoMinutos;
    private final ZoneId fuso;

    public PedidoService(PedidoRepository pedidos, CarrinhoRepository carrinhos, CatalogoClient catalogo,
                         FreteService frete, OutboxPublisher outbox, Clock relogio,
                         @Value("${uzusis.pedido.expiracao-minutos}") int expiracaoMinutos,
                         @Value("${uzusis.fuso}") ZoneId fuso) {
        this.pedidos = pedidos;
        this.carrinhos = carrinhos;
        this.catalogo = catalogo;
        this.frete = frete;
        this.outbox = outbox;
        this.relogio = relogio;
        this.expiracaoMinutos = expiracaoMinutos;
        this.fuso = fuso;
    }

    /**
     * O6: fecha a sacola. Relê cada produto no catálogo antes de criar: o preço
     * cobrado é o de agora, e item esgotado ou desativado é 422 aqui, com a
     * sacola intacta, em vez de um cancelamento assíncrono depois. O pedido e o
     * order.created saem na mesma transação, via outbox.
     *
     * <p>Um pedido aguardando pagamento por cliente: cada pedido reserva o
     * estoque por 30 min e, ao expirar, devolve a sacola. Sem o limite, uma
     * conta repete o O6 a cada expiração e deixa a loja "esgotada" para todos.
     * A sacola travada fecha a corrida de dois O6 simultâneos: o segundo espera
     * e encontra a sacola já vazia.
     */
    @Transactional
    public PedidoResposta criar(String clienteSub, String clienteEmail, String clienteNome, EnderecoEntrega endereco) {
        var carrinho = carrinhos.travar(clienteSub)
                .filter(sacola -> !sacola.getItens().isEmpty())
                .orElseThrow(() -> new ResponseStatusException(UNPROCESSABLE_ENTITY, "Sua sacola está vazia"));
        if (pedidos.existsByClienteSubAndStatus(clienteSub, StatusPedido.CRIADO)) {
            throw new ResponseStatusException(CONFLICT, "Você já tem um pedido aguardando pagamento.");
        }

        var entrega = endereco.normalizado();
        var pedido = new Pedido(clienteSub, clienteEmail, clienteNome, entrega, frete.valor(entrega.uf()));
        var produtos = new HashMap<Long, Optional<ProdutoResumo>>();
        var indisponiveis = new ArrayList<String>();

        for (var linha : carrinho.getItens()) {
            var produto = produtos.computeIfAbsent(linha.getProdutoId(), catalogo::obter).orElse(null);
            var tamanho = produto == null ? null : produto.tamanhoPorId(linha.getTamanhoId());
            if (tamanho == null || tamanho.quantidade() < linha.getQuantidade()) {
                indisponiveis.add(linha.getNomeProduto() + " (" + linha.getSigla() + ")");
            } else {
                pedido.adicionarItem(produto.id(), tamanho.id(), tamanho.sigla(), linha.getQuantidade(),
                        produto.preco(), produto.nome(), produto.fotoUrl());
            }
        }
        if (!indisponiveis.isEmpty()) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Itens indisponíveis: " + String.join(", ", indisponiveis));
        }

        pedidos.saveAndFlush(pedido);
        outbox.publicar(AGREGADO, String.valueOf(pedido.getId()), Topics.ORDER_CREATED,
                new Events.OrderCreated(
                        pedido.getId(),
                        clienteSub,
                        clienteEmail,
                        Money.paraCentavos(pedido.getValorTotal()),
                        pedido.getItens().stream()
                                .map(item -> new Events.Item(item.getProdutoId(), item.getTamanhoId(), item.getSigla(),
                                        item.getQuantidade(), Money.paraCentavos(item.getValorUnitario())))
                                .toList()));

        carrinho.esvaziar();
        log.info("Pedido {} criado para o cliente {}", pedido.getId(), clienteSub);
        return resposta(pedido);
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

        if (pedido.getStatus() != StatusPedido.CRIADO) {
            // Pagamento que chega para pedido já cancelado: quem estorna é o
            // payment, ao consumir o order.cancelled. Aqui só fica o registro.
            log.info("Pedido {} já está {}: resposta ignorada", orderId, pedido.getStatus());
            return;
        }
        resposta.accept(pedido);

        switch (pedido.avaliar()) {
            case PAGAR -> {
                pedido.pagar();
                outbox.publicar(AGREGADO, String.valueOf(orderId), Topics.ORDER_PAID, new Events.OrderPaid(
                        orderId, pedido.getClienteSub(), pedido.getClienteEmail(), pedido.getClienteNome(),
                        Money.paraCentavos(pedido.getValorTotal()), Money.paraCentavos(pedido.getFrete()),
                        itensDoEvento(pedido), enderecoDoEvento(pedido)));
                log.info("Pedido {} pago", orderId);
            }
            case CANCELAR -> cancelar(pedido, null);
            case PENDENTE -> log.debug("Pedido {} continua aguardando resposta", orderId);
        }
    }

    /** Chamado pela {@link ExpiracaoDePedidos}, um pedido por transação. */
    @Transactional
    public void expirar(long orderId) {
        var pedido = pedidos.travarPorId(orderId).orElseThrow();
        if (pedido.getStatus() == StatusPedido.CRIADO) {
            cancelar(pedido, "Pagamento não concluído em " + expiracaoMinutos + " minutos");
        }
    }

    private void cancelar(Pedido pedido, String motivo) {
        boolean restaurar = pedido.devolveASacolaAoCancelar();
        if (restaurar) {
            var carrinho = carrinhos.doCliente(pedido.getClienteSub());
            pedido.getItens().forEach(item -> carrinho.devolver(item.getProdutoId(), item.getTamanhoId(),
                    item.getSigla(), item.getQuantidade(), item.getValorUnitario(),
                    item.getNomeProduto(), item.getFotoUrl()));
        }
        pedido.cancelar(motivo, restaurar);
        outbox.publicar(AGREGADO, String.valueOf(pedido.getId()), Topics.ORDER_CANCELLED, new Events.OrderCancelled(
                pedido.getId(), pedido.getClienteSub(), pedido.getClienteEmail(), pedido.getClienteNome(),
                pedido.getMotivoCancelamento(), restaurar));
        log.info("Pedido {} cancelado: {} (sacola restaurada: {})", pedido.getId(), pedido.getMotivoCancelamento(), restaurar);
    }

    @Transactional(readOnly = true)
    public List<PedidoResposta> meusPedidos(String clienteSub) {
        return pedidos.findByClienteSubOrderByCriadoEmDesc(clienteSub).stream()
                .map(this::resposta)
                .toList();
    }

    /** O8: o dono busca por (id, sub); o admin, só pelo id. */
    @Transactional(readOnly = true)
    public PedidoResposta obter(long id, String clienteSub, boolean admin) {
        var pedido = admin ? pedidos.findWithItensById(id) : pedidos.findWithItensByIdAndClienteSub(id, clienteSub);
        return resposta(pedido.orElseThrow(PedidoService::naoEncontrado));
    }

    @Transactional
    public PedidoResposta receber(long id, String clienteSub) {
        var pedido = pedidos.findWithItensByIdAndClienteSub(id, clienteSub).orElseThrow(PedidoService::naoEncontrado);
        if (pedido.getStatus() == StatusPedido.ENVIADO) {
            pedido.receber();
        } else if (pedido.getStatus() != StatusPedido.RECEBIDO) {
            throw new ResponseStatusException(CONFLICT, "Pedido ainda não foi enviado");
        }
        return resposta(pedido);
    }

    /** O11: só PAGO vira ENVIADO; repetir o clique não publica outro evento. */
    @Transactional
    public PedidoResposta enviar(long id) {
        var pedido = pedidos.travarPorId(id).orElseThrow(PedidoService::naoEncontrado);
        if (pedido.getStatus() == StatusPedido.PAGO) {
            pedido.enviar();
            outbox.publicar(AGREGADO, String.valueOf(id), Topics.ORDER_SHIPPED, new Events.OrderShipped(
                    id, pedido.getClienteSub(), pedido.getClienteEmail(), pedido.getClienteNome(),
                    itensDoEvento(pedido), enderecoDoEvento(pedido)));
            log.info("Pedido {} enviado", id);
        } else if (pedido.getStatus() != StatusPedido.ENVIADO && pedido.getStatus() != StatusPedido.RECEBIDO) {
            throw new ResponseStatusException(CONFLICT, "Só pedidos pagos podem ser enviados");
        }
        return resposta(pedido);
    }

    @Transactional(readOnly = true)
    public Page<PedidoResposta> listarParaAdmin(List<StatusPedido> status, Pageable pagina) {
        if (status.isEmpty() || !STATUS_ADMIN.containsAll(status)) {
            throw new ResponseStatusException(BAD_REQUEST, "Status não permitido nesta lista");
        }
        for (var ordem : pagina.getSort()) {
            if (!ORDENACOES_ADMIN.contains(ordem.getProperty())) {
                throw new ResponseStatusException(BAD_REQUEST, "Ordenação inválida");
            }
        }
        var comDesempate = PageRequest.of(pagina.getPageNumber(), pagina.getPageSize(), pagina.getSort().and(Sort.by("id")));
        return pedidos.findByStatusIn(status, comDesempate).map(this::resposta);
    }

    /** O12: contagem por status e receita do mês corrente no fuso da loja. */
    @Transactional(readOnly = true)
    public Resumo resumo() {
        var porStatus = new EnumMap<StatusPedido, Long>(StatusPedido.class);
        for (var status : StatusPedido.values()) {
            porStatus.put(status, 0L);
        }
        for (var linha : pedidos.contarPorStatus()) {
            porStatus.put((StatusPedido) linha[0], (Long) linha[1]);
        }
        var inicio = YearMonth.now(relogio.withZone(fuso)).atDay(1).atStartOfDay(fuso).toOffsetDateTime();
        var receita = pedidos.somarPagosEntre(STATUS_ADMIN, inicio, inicio.plusMonths(1));
        return new Resumo(porStatus, PedidoDtos.reais(Objects.requireNonNullElse(receita, BigDecimal.ZERO)));
    }

    private PedidoResposta resposta(Pedido pedido) {
        return PedidoResposta.de(pedido, expiracaoMinutos);
    }

    private static ResponseStatusException naoEncontrado() {
        return new ResponseStatusException(NOT_FOUND, "Pedido não encontrado");
    }

    private static List<Events.ItemResumo> itensDoEvento(Pedido pedido) {
        return pedido.getItens().stream()
                .map(item -> new Events.ItemResumo(item.getNomeProduto(), item.getSigla(), item.getQuantidade(),
                        Money.paraCentavos(item.getValorTotal())))
                .toList();
    }

    private static Events.EnderecoEntrega enderecoDoEvento(Pedido pedido) {
        var e = pedido.getEndereco();
        return e == null ? null : new Events.EnderecoEntrega(e.destinatario(), e.telefone(), e.cep(), e.rua(),
                e.numero(), e.complemento(), e.bairro(), e.cidade(), e.uf());
    }
}
