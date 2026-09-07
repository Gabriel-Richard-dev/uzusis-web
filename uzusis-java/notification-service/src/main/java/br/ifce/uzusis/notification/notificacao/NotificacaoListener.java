package br.ifce.uzusis.notification.notificacao;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.LeitorDeEvento;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.idempotency.ConsumoIdempotente;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class NotificacaoListener {

    private final LeitorDeEvento leitor;
    private final ConsumoIdempotente consumo;
    private final EmailService email;

    public NotificacaoListener(LeitorDeEvento leitor, ConsumoIdempotente consumo, EmailService email) {
        this.leitor = leitor;
        this.consumo = consumo;
        this.email = email;
    }

    /**
     * O consumo idempotente aqui não é detalhe: sem ele, cada reentrega do
     * Kafka manda outro e-mail para o cliente.
     */
    @KafkaListener(topics = Topics.ORDER_PAID, groupId = "notification-service")
    void aoPagarPedido(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.OrderPaid.class);
        consumo.umaVez(recebido.eventId(), id -> email.pedidoPago(
                recebido.payload().clienteEmail(),
                recebido.payload().orderId(),
                recebido.payload().valorTotalCentavos()));
    }

    @KafkaListener(topics = Topics.ORDER_CANCELLED, groupId = "notification-service")
    void aoCancelarPedido(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.OrderCancelled.class);
        consumo.umaVez(recebido.eventId(), id -> email.pedidoCancelado(
                recebido.payload().clienteEmail(),
                recebido.payload().orderId(),
                recebido.payload().motivo()));
    }
}
