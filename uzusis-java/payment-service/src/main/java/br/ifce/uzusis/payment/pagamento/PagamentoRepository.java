package br.ifce.uzusis.payment.pagamento;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {

    Optional<Pagamento> findByOrderId(long orderId);

    Optional<Pagamento> findByPaymentIntentId(String paymentIntentId);

    /** Webhook e evento de estorno podem cair juntos no mesmo pagamento. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pagamento p where p.paymentIntentId = :intentId")
    Optional<Pagamento> travarPorIntent(@Param("intentId") String intentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pagamento p where p.orderId = :orderId")
    Optional<Pagamento> travarPorPedido(@Param("orderId") long orderId);

    List<Pagamento> findByStatus(StatusPagamento status);
}
