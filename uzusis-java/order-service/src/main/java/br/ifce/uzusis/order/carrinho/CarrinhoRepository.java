package br.ifce.uzusis.order.carrinho;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CarrinhoRepository extends JpaRepository<Carrinho, Long> {

    @EntityGraph(attributePaths = "itens")
    Optional<Carrinho> findByClienteSub(String clienteSub);
}
