package br.ifce.uzusis.catalog.produto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    @EntityGraph(attributePaths = {"tamanhos", "fotos"})
    Optional<Produto> findWithColecoesById(Long id);

    /**
     * Sem @EntityGraph de propósito nas consultas paginadas: juntar coleção com
     * Pageable faz o Hibernate paginar na memória (HHH90003004). A coleção vem
     * pelo @BatchSize das entidades, que resolve o N+1 sem trazer a tabela toda.
     */
    Page<Produto> findAllByCategoria(CategoriaProduto categoria, Pageable pageable);

    /**
     * O .NET fazia Nome.ToUpper().Contains(...), que no MySQL já era
     * indiferente à caixa. Em Postgres o LIKE não é: IgnoreCase gera ILIKE e
     * mantém a busca funcionando como o usuário espera.
     */
    Page<Produto> findAllByNomeContainingIgnoreCase(String nome, Pageable pageable);
}
