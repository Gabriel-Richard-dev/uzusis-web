package br.ifce.uzusis.catalog.estoque;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReservaEstoqueRepository extends JpaRepository<ReservaEstoque, Long> {

    List<ReservaEstoque> findByOrderIdAndLiberadaFalse(long orderId);

    /**
     * Trava o pedido até o fim da transação. reservar e devolver do mesmo
     * pedido chegam por tópicos diferentes e podem rodar ao mesmo tempo; sem a
     * trava, nenhum dos dois vê o que o outro ainda não commitou.
     */
    @Query(value = "select 1 from pg_advisory_xact_lock(:orderId)", nativeQuery = true)
    Integer travarPedido(@Param("orderId") long orderId);

    @Modifying
    @Query(value = "insert into pedido_cancelado (order_id) values (:orderId) on conflict do nothing",
            nativeQuery = true)
    void marcarCancelado(@Param("orderId") long orderId);

    @Query(value = "select exists (select 1 from pedido_cancelado where order_id = :orderId)", nativeQuery = true)
    boolean pedidoCancelado(@Param("orderId") long orderId);
}
