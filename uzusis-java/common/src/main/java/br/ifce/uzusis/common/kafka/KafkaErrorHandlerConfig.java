package br.ifce.uzusis.common.kafka;

import br.ifce.uzusis.common.event.Topics;
import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;

@Configuration
public class KafkaErrorHandlerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaErrorHandlerConfig.class);

    /**
     * Retentativa com backoff exponencial e, esgotada, DLQ. Uma mensagem
     * envenenada não pode travar a partição: sem a DLQ, um único evento
     * defeituoso para o consumo de todas as entidades que caem naquela
     * partição, e a fila só cresce.
     */
    @Bean
    DefaultErrorHandler errorHandler(KafkaTemplate<Object, Object> template) {
        var recoverer = new DeadLetterPublishingRecoverer(template,
                (registro, excecao) -> {
                    log.error("Evento para a DLQ depois de esgotar as tentativas: topico={} chave={} motivo={}",
                            registro.topic(), registro.key(), excecao.getMessage(), excecao);
                    // Partição -1: deixa o Kafka escolher, a DLQ não precisa ter
                    // o mesmo número de partições do tópico original.
                    return new TopicPartition(Topics.dlqOf(registro.topic()), -1);
                });

        var backoff = new ExponentialBackOff(500L, 2.0);
        backoff.setMaxElapsedTime(30_000L);

        return new DefaultErrorHandler(recoverer, backoff);
    }
}
