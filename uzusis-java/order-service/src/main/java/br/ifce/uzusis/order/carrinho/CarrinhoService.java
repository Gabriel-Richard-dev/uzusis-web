package br.ifce.uzusis.order.carrinho;

import br.ifce.uzusis.order.carrinho.CarrinhoDtos.AdicionarItem;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.CarrinhoResposta;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.ItemResposta;
import br.ifce.uzusis.order.catalogo.CatalogoClient;
import br.ifce.uzusis.order.catalogo.ProdutoResumo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static br.ifce.uzusis.order.carrinho.Carrinho.MAXIMO_POR_ITEM;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;

@Service
public class CarrinhoService {

    private final CarrinhoRepository repository;
    private final CatalogoClient catalogo;

    public CarrinhoService(CarrinhoRepository repository, CatalogoClient catalogo) {
        this.repository = repository;
        this.catalogo = catalogo;
    }

    @Transactional(readOnly = true)
    public CarrinhoResposta obter(String clienteSub) {
        return repository.findByClienteSub(clienteSub)
                .map(CarrinhoResposta::de)
                .orElseGet(() -> CarrinhoResposta.de(new Carrinho(clienteSub)));
    }

    /** O2: soma na linha do mesmo tamanho; os limites valem para a linha somada. */
    @Transactional
    public ItemResposta adicionar(String clienteSub, AdicionarItem requisicao) {
        var produto = produto(requisicao.produtoId());
        var sigla = requisicao.sigla().toUpperCase();
        var tamanho = produto.tamanhoPorSigla(sigla);
        if (tamanho == null) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Este produto não tem o tamanho " + sigla);
        }

        var carrinho = repository.doCliente(clienteSub);
        var linha = carrinho.linhaDo(tamanho.id());
        int jaNaSacola = linha == null ? 0 : linha.getQuantidade();
        conferir(jaNaSacola + requisicao.quantidade(), tamanho, jaNaSacola);

        if (linha == null) {
            linha = carrinho.novaLinha(produto.id(), tamanho.id(), tamanho.sigla());
        }
        linha.atualizar(jaNaSacola + requisicao.quantidade(), produto.preco(), produto.nome(), produto.fotoUrl());
        repository.flush();
        return ItemResposta.de(linha);
    }

    /** O3: a nova quantidade substitui a antiga; preço, nome e foto voltam do catálogo. */
    @Transactional
    public ItemResposta alterar(String clienteSub, long itemId, int quantidade) {
        var linha = linhaDoCliente(clienteSub, itemId);
        var produto = produto(linha.getProdutoId());
        var tamanho = produto.tamanhoPorId(linha.getTamanhoId());
        if (tamanho == null) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Este produto não tem o tamanho " + linha.getSigla());
        }
        conferir(quantidade, tamanho, 0);
        linha.atualizar(quantidade, produto.preco(), produto.nome(), produto.fotoUrl());
        return ItemResposta.de(linha);
    }

    @Transactional
    public void remover(String clienteSub, long itemId) {
        if (!repository.findByClienteSub(clienteSub).map(carrinho -> carrinho.remover(itemId)).orElse(false)) {
            throw new ResponseStatusException(NOT_FOUND, "Item não está na sua sacola");
        }
    }

    /** Busca pela sacola do próprio cliente: item de outra pessoa é 404, nunca 403. */
    private ItemCarrinho linhaDoCliente(String clienteSub, long itemId) {
        return repository.findByClienteSub(clienteSub)
                .map(carrinho -> carrinho.item(itemId))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Item não está na sua sacola"));
    }

    private ProdutoResumo produto(long produtoId) {
        return catalogo.obter(produtoId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Produto não encontrado"));
    }

    private static void conferir(int total, ProdutoResumo.Tamanho tamanho, int jaNaSacola) {
        if (total > MAXIMO_POR_ITEM) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY, "Máximo de 99 unidades por item");
        }
        if (total > tamanho.quantidade()) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY,
                    "Quantidade pedida excede o estoque do tamanho " + tamanho.sigla()
                            + " (restam " + Math.max(0, tamanho.quantidade() - jaNaSacola) + ")");
        }
    }
}
