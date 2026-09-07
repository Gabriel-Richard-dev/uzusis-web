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

    @KafkaListener(topics = Topics.ORDER_REFUND_REQUESTED, groupId = "payment-service")
    void aoPedirEstorno(String mensagem) {
        var recebido = leitor.ler(mensagem, Events.RefundRequested.class);
        consumo.umaVez(recebido.eventId(), id -> pagamentos.estornar(recebido.payload()));
    }
}
