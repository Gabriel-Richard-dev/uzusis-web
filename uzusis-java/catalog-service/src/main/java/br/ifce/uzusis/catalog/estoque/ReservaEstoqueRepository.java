package br.ifce.uzusis.catalog.estoque;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReservaEstoqueRepository extends JpaRepository<ReservaEstoque, Long> {

    List<ReservaEstoque> findByOrderIdAndLiberadaFalse(long orderId);
}
