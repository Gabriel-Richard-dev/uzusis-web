package br.ifce.uzusis.order.pedido;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.OffsetDateTime;

/**
 * Cancela o pedido que ficou em CRIADO além do prazo: sem isso, um checkout
 * abandonado prende o estoque reservado para sempre. Se o pagamento tiver
 * entrado mesmo assim, o payment estorna ao ver o order.cancelled.
 */
@Component
public class ExpiracaoDePedidos {

    private static final Logger log = LoggerFactory.getLogger(ExpiracaoDePedidos.class);

    private final PedidoRepository pedidos;
    private final PedidoService service;
    private final Clock relogio;
    private final int minutos;

    public ExpiracaoDePedidos(PedidoRepository pedidos, PedidoService service, Clock relogio,
                              @Value("${uzusis.pedido.expiracao-minutos}") int minutos) {
        this.pedidos = pedidos;
        this.service = service;
        this.relogio = relogio;
        this.minutos = minutos;
    }

    /** Cada pedido na sua transação (em outro bean): um que falha não desfaz os outros. */
    @Scheduled(fixedDelayString = "${uzusis.pedido.varredura-ms:60000}")
    public void expirarVencidos() {
        var limite = OffsetDateTime.now(relogio).minusMinutes(minutos);
        for (long id : pedidos.idsPorStatusCriadosAntesDe(StatusPedido.CRIADO, limite)) {
            try {
                service.expirar(id);
            } catch (RuntimeException e) {
                log.error("Falha ao expirar o pedido {}", id, e);
            }
        }
    }
}
