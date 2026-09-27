package br.ifce.uzusis.catalog.produto;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TamanhoRepository extends JpaRepository<Tamanho, Long> {

    /**
     * Trava as linhas antes de conferir o saldo. Sem a trava, dois pedidos
     * simultâneos do último item leem "1 disponível" e os dois passam — o
     * estoque vira negativo e alguém não recebe a peça.
     *
     * <p>O ORDER BY não é cosmético: travar sempre na mesma ordem de id evita
     * deadlock entre dois pedidos que compartilham tamanhos.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Tamanho t where t.id in :ids order by t.id")
    List<Tamanho> travarPorIds(@Param("ids") Collection<Long> ids);
}
