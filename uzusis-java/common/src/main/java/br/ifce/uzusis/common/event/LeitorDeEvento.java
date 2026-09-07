package br.ifce.uzusis.common.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * Abre o envelope e devolve o payload já tipado. Todo consumidor precisa das
 * duas coisas: o eventId (para o consumo idempotente) e o payload de domínio.
 */
@Component
public class LeitorDeEvento {

    private final ObjectMapper mapper;

    public LeitorDeEvento(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public <T> Recebido<T> ler(String mensagem, Class<T> tipoDoPayload) {
        try {
            var envelope = mapper.readValue(mensagem, EventEnvelope.class);
            return new Recebido<>(envelope.eventId(), mapper.readValue(envelope.payload(), tipoDoPayload));
        } catch (IOException e) {
            // Mensagem ilegível não tem retentativa que resolva: vai direto
            // para a DLQ em vez de travar a partição.
            throw new EventoIlegivelException(mensagem, e);
        }
    }

    public record Recebido<T>(UUID eventId, T payload) {
    }

    public static class EventoIlegivelException extends RuntimeException {
        public EventoIlegivelException(String mensagem, Throwable causa) {
            super("Evento fora do contrato: " + mensagem, causa);
        }
    }
}
