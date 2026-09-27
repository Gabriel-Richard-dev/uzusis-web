package br.ifce.uzusis.order.carrinho;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CarrinhoRepository extends JpaRepository<Carrinho, Long> {

    @EntityGraph(attributePaths = "itens")
    Optional<Carrinho> findByClienteSub(String clienteSub);

    @Modifying
    @Query(value = "insert into carrinho (cliente_sub) values (:sub) on conflict (cliente_sub) do nothing",
            nativeQuery = true)
    void criarSeNaoExiste(@Param("sub") String clienteSub);

    /**
     * Trava a sacola até o fim da transação. Sem a trava, dois "adicionar"
     * simultâneos do mesmo tamanho (duas abas) não veem a linha um do outro e
     * criam duas, e o O6, que confere linha a linha, deixa passar mais que o
     * estoque. Os itens vêm depois da trava, já com o que o outro gravou.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Carrinho c where c.clienteSub = :sub")
    Optional<Carrinho> travar(@Param("sub") String clienteSub);

    /**
     * A sacola do cliente, criada se preciso, e travada. Dois primeiros
     * "adicionar" simultâneos não dão 500: o segundo insert espera o primeiro e
     * não faz nada.
     */
    default Carrinho doCliente(String clienteSub) {
        criarSeNaoExiste(clienteSub);
        return travar(clienteSub).orElseThrow();
    }
}
