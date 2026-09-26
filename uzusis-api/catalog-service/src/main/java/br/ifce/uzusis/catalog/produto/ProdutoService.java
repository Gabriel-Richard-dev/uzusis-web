package br.ifce.uzusis.catalog.produto;

import br.ifce.uzusis.catalog.produto.ProdutoDtos.AtualizarProduto;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.CriarProduto;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.ProdutoResposta;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.TamanhoRequisicao;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class ProdutoService {

    private static final Set<String> ORDENAVEIS = Set.of("criadoEm", "preco", "nome");

    private final ProdutoRepository repository;

    public ProdutoService(ProdutoRepository repository) {
        this.repository = repository;
    }

    /** C1: só ativo com algum tamanho em estoque. */
    @Transactional(readOnly = true)
    public Page<ProdutoResposta> vitrine(CategoriaProduto categoria, String nome, Pageable pagina) {
        return listar(categoria, nome, true, true, pagina);
    }

    /** C4: todos, com os filtros que vierem. "Sem estoque" = ativo e não disponível. */
    @Transactional(readOnly = true)
    public Page<ProdutoResposta> listar(CategoriaProduto categoria, String nome, Boolean ativo, Boolean disponivel,
                                        Pageable pagina) {
        var filtro = Specification.allOf(categoria(categoria), nome(nome), ativo(ativo), disponivel(disponivel));
        return repository.findAll(filtro, ordenada(pagina)).map(ProdutoResposta::de);
    }

    /** C2: inativo só para o admin; para os demais, como se não existisse. */
    @Transactional(readOnly = true)
    public ProdutoResposta obter(long id, boolean admin) {
        var produto = buscar(id);
        if (!produto.isAtivo() && !admin) {
            throw naoEncontrado();
        }
        return ProdutoResposta.de(produto);
    }

    @Transactional
    public ProdutoResposta criar(CriarProduto requisicao) {
        semRepeticao(requisicao.tamanhos());
        var produto = new Produto(requisicao.nome(), requisicao.preco(), requisicao.descricao(), requisicao.categoria());
        requisicao.tamanhos().forEach(t -> produto.adicionarTamanho(t.sigla(), t.quantidade()));
        return ProdutoResposta.de(repository.save(produto));
    }

    @Transactional
    public ProdutoResposta atualizar(long id, AtualizarProduto requisicao) {
        var produto = buscar(id);
        produto.atualizar(requisicao.nome(), requisicao.preco(), requisicao.descricao(), requisicao.categoria(),
                requisicao.ativo());
        return ProdutoResposta.de(produto);
    }

    /** C8: sigla enviada tem a quantidade definida (ou a linha criada); as outras ficam intactas. */
    @Transactional
    public ProdutoResposta atualizarEstoque(long id, List<TamanhoRequisicao> tamanhos) {
        semRepeticao(tamanhos);
        var produto = buscar(id);
        tamanhos.forEach(t -> produto.definirEstoque(t.sigla(), t.quantidade()));
        repository.flush(); // o tamanho novo precisa do id na resposta
        return ProdutoResposta.de(produto);
    }

    /** C9: soft delete, idempotente. Reativar é C7 com ativo=true. */
    @Transactional
    public void excluir(long id) {
        buscar(id).desativar();
    }

    private Produto buscar(long id) {
        return repository.findById(id).orElseThrow(ProdutoService::naoEncontrado);
    }

    private static ResponseStatusException naoEncontrado() {
        return new ResponseStatusException(NOT_FOUND, "Produto não encontrado");
    }

    private static void semRepeticao(List<TamanhoRequisicao> tamanhos) {
        var vistas = new HashSet<String>();
        for (var tamanho : tamanhos) {
            var sigla = tamanho.sigla().toUpperCase(Locale.ROOT);
            if (!vistas.add(sigla)) {
                throw new ResponseStatusException(BAD_REQUEST, "Tamanho repetido: " + sigla);
            }
        }
    }

    /** Whitelist, e desempate por id: sem ele, produtos de mesmo preço trocam de página entre requisições. */
    private static Pageable ordenada(Pageable pagina) {
        for (var ordem : pagina.getSort()) {
            if (!ORDENAVEIS.contains(ordem.getProperty())) {
                throw new ResponseStatusException(BAD_REQUEST, "Ordenação inválida");
            }
        }
        return PageRequest.of(pagina.getPageNumber(), pagina.getPageSize(),
                pagina.getSort().and(Sort.by(Sort.Direction.DESC, "id")));
    }

    // Filtro null = não filtra (Specification.allOf ignora). Nada de ":param is
    // null" em JPQL: o Postgres não infere o tipo de um parâmetro nulo.

    private static Specification<Produto> categoria(CategoriaProduto categoria) {
        return categoria == null ? null : (root, query, cb) -> cb.equal(root.get("categoria"), categoria);
    }

    private static Specification<Produto> ativo(Boolean ativo) {
        return ativo == null ? null : (root, query, cb) -> cb.equal(root.get("ativo"), ativo);
    }

    private static Specification<Produto> disponivel(Boolean disponivel) {
        if (disponivel == null) {
            return null;
        }
        return (root, query, cb) -> {
            var comEstoque = query.subquery(Long.class);
            var tamanho = comEstoque.from(Tamanho.class);
            comEstoque.select(tamanho.get("id"))
                    .where(cb.equal(tamanho.get("produto"), root), cb.greaterThan(tamanho.get("quantidade"), 0));
            return disponivel ? cb.exists(comEstoque) : cb.not(cb.exists(comEstoque));
        };
    }

    /** Substring sem caixa e sem acento: "calca" acha "Calça". % e _ do termo valem como texto. */
    private static Specification<Produto> nome(String termo) {
        if (termo == null || termo.isBlank()) {
            return null;
        }
        var padrao = "%" + termo.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return (root, query, cb) -> cb.like(semAcento(cb, root.get("nome")), semAcento(cb, cb.literal(padrao)), '\\');
    }

    /**
     * lower depois do unaccent: com LC_CTYPE=C o lower do Postgres só mexe em
     * ASCII, e "Í" ficaria maiúsculo; sem o acento, vira "I" e o lower resolve.
     */
    private static Expression<String> semAcento(CriteriaBuilder cb, Expression<String> texto) {
        return cb.lower(cb.function("unaccent", String.class, texto));
    }
}
