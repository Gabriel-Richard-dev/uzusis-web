package br.ifce.uzusis.payment.webhook;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WebhookRecebidoRepository extends JpaRepository<WebhookRecebido, String> {

    List<WebhookRecebido> findByProcessadoFalseOrderByRecebidoEmAsc(Limit limite);
}
