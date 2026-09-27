package br.ifce.uzusis.payment.pagamento;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.LeitorDeEvento;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.idempotency.ConsumoIdempotente;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class PagamentoListener {

    private final LeitorDeEvento leitor;
    private final ConsumoIdempotente consumo;
    private final PagamentoService pagamentos;

    public PagamentoListener(LeitorDeEvento leitor, ConsumoIdempotente consumo, PagamentoService pagamentos) {
        this.leitor = leitor;
        this.consumo = consumo;
        this.pagamentos = pagamentos;
    }

    @KafkaListener(topics = Topics.ORDER_CREATED, groupId = "payment-service")
    void aoCriarPedido(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.OrderCreated.class);
        consumo.umaVez(recebido.eventId(), id -> pagamentos.criarIntent(recebido.payload()));
    }

    /** Cancela o intent ou, se já pagou, estorna. É o único caminho de estorno. */
    @KafkaListener(topics = Topics.ORDER_CANCELLED, groupId = "payment-service")
    void aoCancelarPedido(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.OrderCancelled.class);
        consumo.umaVez(recebido.eventId(), id -> pagamentos.cancelarPorPedido(recebido.payload()));
    }
}
