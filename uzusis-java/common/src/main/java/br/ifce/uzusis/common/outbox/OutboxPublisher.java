package br.ifce.uzusis.common.outbox;

import br.ifce.uzusis.common.event.EventEnvelope;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class OutboxPublisher {

    private final OutboxRepository repository;
    private final ObjectMapper mapper;

    public OutboxPublisher(OutboxRepository repository, ObjectMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    /**
     * Propagation.MANDATORY é o ponto central: publicar fora de uma transação
     * de negócio já aberta lança exceção em vez de gerar um evento órfão.
     * A garantia do outbox deixa de depender de alguém lembrar da regra.
     *
     * @param topic um dos nomes de {@link br.ifce.uzusis.common.event.Topics}.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void publicar(String aggregateType, String aggregateId, String topic, Object payload) {
        repository.save(new OutboxEvent(
                UUID.randomUUID(),
                aggregateType,
                aggregateId,
                payload.getClass().getSimpleName(),
                topic,
                serializar(topic, aggregateId, payload)));
    }

    private String serializar(String topic, String aggregateId, Object payload) {
        try {
            var envelope = new EventEnvelope(
                    UUID.randomUUID(),
                    topic,
                    aggregateId,
                    OffsetDateTime.now(),
                    versaoDoTopico(topic),
                    mapper.writeValueAsString(payload));
            return mapper.writeValueAsString(envelope);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Evento não serializável: " + topic, e);
        }
    }

    /** A versão sai do sufixo .vN do tópico, então contrato e tópico não divergem. */
    private static int versaoDoTopico(String topic) {
        int marca = topic.lastIndexOf(".v");
        if (marca < 0) {
            throw new IllegalArgumentException("Tópico sem sufixo de versão .vN: " + topic);
        }
        return Integer.parseInt(topic.substring(marca + 2));
    }
}
