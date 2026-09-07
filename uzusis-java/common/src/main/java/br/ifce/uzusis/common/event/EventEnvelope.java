package br.ifce.uzusis.common.event;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Envelope de todo evento no barramento. Os campos fixos vêm antes do payload
 * de domínio: eventId serve para o consumo idempotente, aggregateId é a chave
 * de partição (garante ordem por entidade) e version é a versão do contrato,
 * que também aparece no nome do tópico.
 *
 * @param payload dados de domínio já serializados em JSON.
 */
public record EventEnvelope(
        UUID eventId,
        String type,
        String aggregateId,
        OffsetDateTime occurredAt,
        int version,
        String payload) {
}
