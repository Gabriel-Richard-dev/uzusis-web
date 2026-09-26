package br.ifce.uzusis.common.kafka;

import br.ifce.uzusis.common.event.LeitorDeEvento;
import br.ifce.uzusis.common.event.Topics;
import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;

import java.util.Set;

@Configuration
public class KafkaErrorHandlerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaErrorHandlerConfig.class);

    /**
     * Retentativa com backoff exponencial e, esgotada, DLQ. Uma mensagem
     * envenenada não pode travar a partição: sem a DLQ, um único evento
     * defeituoso para o consumo de todas as entidades que caem naquela
     * partição, e a fila só cresce.
     *
     * <p>Exceção: os tópicos em {@code uzusis.kafka.compensacoes} (o
     * order.cancelled no catalog e no payment). A DLQ não tem consumidor, e uma
     * compensação descartada por falha passageira (Postgres fora por uns
     * minutos) deixa o cliente cobrado sem estorno e a peça presa numa reserva.
     * Então ela é retentada sem limite, com o intervalo dobrando até 1 min, e
     * trava só a própria partição, com um ERROR a cada tentativa. O teto de
     * 1 min fica bem abaixo do max.poll.interval.ms (5 min): a espera é na
     * thread do consumidor, e passar dele tira o consumidor do grupo. Um bug
     * determinístico ali também trava, e é o preço aceito: dinheiro parado e
     * barulhento em vez de sumido. Evento ilegível continua indo direto para a
     * DLQ (a classificação vem antes do backoff).
     */
    @Bean
    DefaultErrorHandler errorHandler(KafkaTemplate<Object, Object> template,
                                     @Value("${uzusis.kafka.compensacoes:}") Set<String> compensacoes) {
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

        var handler = new DefaultErrorHandler(recoverer, backoff);
        // Evento ilegível não melhora com retentativa: vai direto para a DLQ.
        handler.addNotRetryableExceptions(LeitorDeEvento.EventoIlegivelException.class);
        // null = o backoff padrão acima.
        handler.setBackOffFunction((registro, excecao) -> compensacoes.contains(registro.topic()) ? semLimite() : null);
        return handler;
    }

    private static ExponentialBackOff semLimite() {
        var backoff = new ExponentialBackOff(500L, 2.0);
        backoff.setMaxInterval(60_000L);
        return backoff;
    }
}
