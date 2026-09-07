package br.ifce.uzusis.order.pedido;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @EntityGraph(attributePaths = "itens")
    Optional<Pedido> findWithItensById(Long id);
}
