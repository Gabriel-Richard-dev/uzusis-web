package br.ifce.uzusis.common.idempotency;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.function.Consumer;

@Component
public class ConsumoIdempotente {

    private static final Logger log = LoggerFactory.getLogger(ConsumoIdempotente.class);

    private final ProcessedEventRepository repository;

    public ConsumoIdempotente(ProcessedEventRepository repository) {
        this.repository = repository;
    }

    /**
     * Roda o trabalho uma única vez por eventId. A marca e o efeito ficam na
     * mesma transação: ou os dois valem, ou nenhum vale — se o trabalho falha,
     * o rollback devolve o evento para a retentativa.
     *
     * <p>A chave primária de processed_event é o desempate real. A checagem
     * prévia só evita o caminho da exceção; quem garante é a constraint, que
     * estoura na segunda entrega concorrente e devolve a mensagem ao retry —
     * na volta, o exists() já corta.
     *
     * @return false se o evento já havia sido processado.
     */
    @Transactional
    public boolean umaVez(UUID eventId, Consumer<UUID> trabalho) {
        if (repository.existsById(eventId)) {
            log.debug("Evento {} já processado, ignorando", eventId);
            return false;
        }
        repository.saveAndFlush(new ProcessedEvent(eventId));
        trabalho.accept(eventId);
        return true;
    }
}
