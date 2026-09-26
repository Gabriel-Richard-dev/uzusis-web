package br.ifce.uzusis.catalog.produto;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Sem @EntityGraph: tamanhos e fotos são duas List (bags), e buscá-las juntas
 * com fetch dá MultipleBagFetchException; nas consultas paginadas faria o
 * Hibernate paginar em memória. As coleções vêm pelo @BatchSize das entidades.
 */
public interface ProdutoRepository extends JpaRepository<Produto, Long>, JpaSpecificationExecutor<Produto> {

    /** Serializa as operações de foto do mesmo produto: limite de 6 e ordem sem buraco. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Produto p where p.id = :id")
    Optional<Produto> travarPorId(@Param("id") long id);
}
