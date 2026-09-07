package br.ifce.uzusis.catalog.estoque;

import br.ifce.uzusis.catalog.produto.Tamanho;
import br.ifce.uzusis.catalog.produto.TamanhoRepository;
import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.outbox.OutboxPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class EstoqueService {

    private static final Logger log = LoggerFactory.getLogger(EstoqueService.class);
    private static final String AGREGADO = "Estoque";

    private final TamanhoRepository tamanhos;
    private final ReservaEstoqueRepository reservas;
    private final OutboxPublisher outbox;

    public EstoqueService(TamanhoRepository tamanhos, ReservaEstoqueRepository reservas, OutboxPublisher outbox) {
        this.tamanhos = tamanhos;
        this.reservas = reservas;
        this.outbox = outbox;
    }

    /**
     * Confere tudo antes de baixar qualquer coisa. Reservar item por item e
     * desistir no meio deixaria peça presa num pedido que foi rejeitado.
     */
    @Transactional
    public void reservar(long orderId, List<Events.Item> itens) {
        // O mesmo tamanho pode aparecer em dois itens do pedido; o que conta
        // para o saldo é a soma.
        Map<Long, Integer> pedidoPorTamanho = itens.stream()
                .collect(Collectors.groupingBy(Events.Item::tamanhoId,
                        Collectors.summingInt(Events.Item::quantidade)));

        Map<Long, Tamanho> travados = tamanhos.travarPorIds(pedidoPorTamanho.keySet()).stream()
                .collect(Collectors.toMap(Tamanho::getId, Function.identity()));

        var semSaldo = pedidoPorTamanho.entrySet().stream()
                .filter(pedido -> {
                    var tamanho = travados.get(pedido.getKey());
                    return tamanho == null || tamanho.getQuantidade() < pedido.getValue();
                })
                .map(pedido -> String.valueOf(pedido.getKey()))
                .toList();

        if (!semSaldo.isEmpty()) {
            var motivo = "Sem estoque para o(s) tamanho(s): " + String.join(", ", semSaldo);
            log.info("Pedido {} rejeitado pelo estoque: {}", orderId, motivo);
            outbox.publicar(AGREGADO, String.valueOf(orderId), Topics.STOCK_REJECTED,
                    new Events.StockRejected(orderId, motivo));
            return;
        }

        pedidoPorTamanho.forEach((tamanhoId, quantidade) -> {
            travados.get(tamanhoId).reservar(quantidade);
            reservas.save(new ReservaEstoque(orderId, tamanhoId, quantidade));
        });

        outbox.publicar(AGREGADO, String.valueOf(orderId), Topics.STOCK_RESERVED,
                new Events.StockReserved(orderId, itens));
    }

    /** Compensação: o pedido caiu, a peça volta para a vitrine. */
    @Transactional
    public void devolver(long orderId) {
        var aLiberar = reservas.findByOrderIdAndLiberadaFalse(orderId);
        if (aLiberar.isEmpty()) {
            log.debug("Pedido {} não tem reserva ativa, nada a devolver", orderId);
            return;
        }

        var ids = aLiberar.stream().map(ReservaEstoque::getTamanhoId).toList();
        Map<Long, Tamanho> travados = tamanhos.travarPorIds(ids).stream()
                .collect(Collectors.toMap(Tamanho::getId, Function.identity()));

        aLiberar.forEach(reserva -> {
            var tamanho = travados.get(reserva.getTamanhoId());
            if (tamanho != null) {
                tamanho.devolver(reserva.getQuantidade());
            }
            reserva.liberar();
        });

        log.info("Estoque devolvido para o pedido {}: {} reserva(s)", orderId, aLiberar.size());
    }
}
