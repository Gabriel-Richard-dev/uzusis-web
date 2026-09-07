package br.ifce.uzusis.catalog.produto;

import br.ifce.uzusis.catalog.produto.ProdutoDtos.AtualizarProduto;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.CriarProduto;
import br.ifce.uzusis.catalog.produto.ProdutoDtos.ProdutoResposta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class ProdutoService {

    private final ProdutoRepository repository;

    public ProdutoService(ProdutoRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Page<ProdutoResposta> listar(CategoriaProduto categoria, String nome, Pageable pagina) {
        Page<Produto> produtos;
        if (categoria != null) {
            produtos = repository.findAllByCategoria(categoria, pagina);
        } else if (nome != null && !nome.isBlank()) {
            produtos = repository.findAllByNomeContainingIgnoreCase(nome, pagina);
        } else {
            produtos = repository.findAll(pagina);
        }
        return produtos.map(ProdutoResposta::de);
    }

    @Transactional(readOnly = true)
    public ProdutoResposta obter(long id) {
        return repository.findWithColecoesById(id)
                .map(ProdutoResposta::de)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Produto não encontrado"));
    }

    @Transactional
    public ProdutoResposta criar(CriarProduto requisicao) {
        var produto = new Produto(requisicao.nome(), requisicao.preco(), requisicao.descricao(), requisicao.categoria());
        if (requisicao.tamanhos() != null) {
            requisicao.tamanhos().forEach(t -> produto.adicionarTamanho(t.sigla(), t.quantidade()));
        }
        return ProdutoResposta.de(repository.save(produto));
    }

    @Transactional
    public ProdutoResposta atualizar(long id, AtualizarProduto requisicao) {
        var produto = repository.findWithColecoesById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Produto não encontrado"));
        produto.atualizar(requisicao.nome(), requisicao.preco(), requisicao.descricao(), requisicao.categoria());
        return ProdutoResposta.de(produto);
    }

    @Transactional
    public void excluir(long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Produto não encontrado");
        }
        repository.deleteById(id);
    }
}
