package br.ifce.uzusis.order.pedido;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    /**
     * Trava o pedido antes de mexer no estado da saga. Estoque e pagamento
     * respondem por caminhos diferentes e podem chegar ao mesmo tempo: sem a
     * trava, um sobrescreve a decisão do outro e o pedido fica pago e
     * cancelado ao mesmo tempo.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pedido p where p.id = :id")
    Optional<Pedido> travarPorId(@Param("id") long id);

    @EntityGraph(attributePaths = "itens")
    List<Pedido> findByClienteSubOrderByCriadoEmDesc(String clienteSub);

    boolean existsByClienteSubAndStatus(String clienteSub, StatusPedido status);

    @EntityGraph(attributePaths = "itens")
    Optional<Pedido> findWithItensById(Long id);

    @EntityGraph(attributePaths = "itens")
    Optional<Pedido> findWithItensByIdAndClienteSub(Long id, String clienteSub);

    /** Sem EntityGraph: fetch de coleção com paginação pagina em memória. Os itens vêm pelo @BatchSize. */
    Page<Pedido> findByStatusIn(Collection<StatusPedido> status, Pageable pagina);

    @Query("select p.id from Pedido p where p.status = :status and p.criadoEm < :limite")
    List<Long> idsPorStatusCriadosAntesDe(@Param("status") StatusPedido status,
                                          @Param("limite") OffsetDateTime limite);

    @Query("select p.status, count(p) from Pedido p group by p.status")
    List<Object[]> contarPorStatus();

    /** null quando não há pedido no período. */
    @Query("select sum(p.valorTotal) from Pedido p where p.status in :status and p.pagoEm >= :inicio and p.pagoEm < :fim")
    BigDecimal somarPagosEntre(@Param("status") Collection<StatusPedido> status,
                               @Param("inicio") OffsetDateTime inicio,
                               @Param("fim") OffsetDateTime fim);
}
