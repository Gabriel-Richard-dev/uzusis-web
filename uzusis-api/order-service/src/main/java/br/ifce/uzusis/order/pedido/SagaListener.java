package br.ifce.uzusis.order.pedido;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.LeitorDeEvento;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.idempotency.ConsumoIdempotente;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * As quatro respostas que a saga de compra pode receber. Nenhuma delas assume
 * ordem de chegada — quem decide é {@link Pedido#avaliar()}.
 */
@Component
public class SagaListener {

    private final LeitorDeEvento leitor;
    private final ConsumoIdempotente consumo;
    private final PedidoService pedidos;

    public SagaListener(LeitorDeEvento leitor, ConsumoIdempotente consumo, PedidoService pedidos) {
        this.leitor = leitor;
        this.consumo = consumo;
        this.pedidos = pedidos;
    }

    @KafkaListener(topics = Topics.STOCK_RESERVED, groupId = "order-service")
    void aoReservarEstoque(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.StockReserved.class);
        consumo.umaVez(recebido.eventId(),
                id -> pedidos.aoResponderEstoque(recebido.payload().orderId(), true, null));
    }

    @KafkaListener(topics = Topics.STOCK_REJECTED, groupId = "order-service")
    void aoRejeitarEstoque(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.StockRejected.class);
        consumo.umaVez(recebido.eventId(),
                id -> pedidos.aoResponderEstoque(recebido.payload().orderId(), false,
                        recebido.payload().motivo()));
    }

    @KafkaListener(topics = Topics.PAYMENT_SUCCEEDED, groupId = "order-service")
    void aoConfirmarPagamento(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.PaymentSucceeded.class);
        consumo.umaVez(recebido.eventId(),
                id -> pedidos.aoResponderPagamento(recebido.payload().orderId(), true,
                        recebido.payload().paymentIntentId(), null));
    }

    @KafkaListener(topics = Topics.PAYMENT_FAILED, groupId = "order-service")
    void aoFalharPagamento(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.PaymentFailed.class);
        consumo.umaVez(recebido.eventId(),
                id -> pedidos.aoResponderPagamento(recebido.payload().orderId(), false,
                        recebido.payload().paymentIntentId(), recebido.payload().motivo()));
    }
}
