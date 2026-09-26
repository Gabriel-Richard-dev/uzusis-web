package br.ifce.uzusis.common.kafka;

import br.ifce.uzusis.common.event.LeitorDeEvento;
import br.ifce.uzusis.common.event.Topics;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.listener.MessageListenerContainer;

import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * O handler de verdade, com o container mockado: parado, ele não espera o
 * backoff inteiro, então 20 entregas levam uns poucos segundos.
 */
class KafkaErrorHandlerConfigTest {

    @SuppressWarnings("unchecked")
    private final KafkaTemplate<Object, Object> template = mock(KafkaTemplate.class);
    private final DefaultErrorHandler handler;

    KafkaErrorHandlerConfigTest() {
        when(template.send(any(ProducerRecord.class))).thenReturn(CompletableFuture.completedFuture(null));
        handler = new KafkaErrorHandlerConfig().errorHandler(template, Set.of(Topics.ORDER_CANCELLED));
    }

    @Test
    void compensacao_nao_vai_para_a_dlq_por_falha_passageira_mas_evento_ilegivel_vai() {
        var bancoFora = new IllegalStateException("Postgres fora do ar");

        // Tópico comum: o limite de 30 s acaba na 7ª entrega, e o evento vai para a DLQ.
        entregar(Topics.ORDER_CREATED, 0, bancoFora, 10);
        verify(template).send(naDlq(Topics.ORDER_CREATED));

        // Compensação: 20 entregas e ainda nada na DLQ; segue retentando.
        entregar(Topics.ORDER_CANCELLED, 1, bancoFora, 20);
        verify(template, never()).send(naDlq(Topics.ORDER_CANCELLED));

        // Ilegível não melhora com retentativa, nem sendo compensação.
        entregar(Topics.ORDER_CANCELLED, 2, new LeitorDeEvento.EventoIlegivelException("{", null), 1);
        verify(template).send(naDlq(Topics.ORDER_CANCELLED));
    }

    private static ProducerRecord<Object, Object> naDlq(String topico) {
        return argThat(registro -> registro.topic().equals(Topics.dlqOf(topico)));
    }

    private void entregar(String topico, long offset, Exception erro, int vezes) {
        var registro = new ConsumerRecord<Object, Object>(topico, 0, offset, "1", "{}");
        var container = mock(MessageListenerContainer.class);
        for (int i = 0; i < vezes; i++) {
            try {
                handler.handleRemaining(erro, List.of(registro), mock(Consumer.class), container);
            } catch (KafkaException seekDeNovo) {
                // "Seek to current after exception": o container entrega de novo.
            }
        }
    }
}
