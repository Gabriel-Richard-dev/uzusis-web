package br.ifce.uzusis.order.carrinho;

import br.ifce.uzusis.order.carrinho.CarrinhoDtos.AdicionarItem;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.CarrinhoResposta;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.ItemResposta;
import br.ifce.uzusis.order.catalogo.CatalogoClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    @Transactional
    public ItemResposta adicionar(String clienteSub, AdicionarItem requisicao) {
        var produto = catalogo.obter(requisicao.produtoId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Produto não encontrado"));

        var tamanho = produto.tamanhoPorSigla(requisicao.sigla());
        if (tamanho == null) {
            // O .NET estourava NullReferenceException (HTTP 500) quando o
            // produto não tinha a sigla pedida. É um 422 com motivo, não uma
            // falha do servidor.
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY,
                    "Produto não tem o tamanho " + requisicao.sigla().toUpperCase());
        }

        var carrinho = repository.findByClienteSub(clienteSub)
                .orElseGet(() -> repository.save(new Carrinho(clienteSub)));

        int jaNoCarrinho = carrinho.quantidadeReservadaDe(tamanho.id());
        if (jaNoCarrinho + requisicao.quantidade() > tamanho.quantidade()) {
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY,
                    "Quantidade pedida excede o estoque do tamanho " + tamanho.sigla());
        }

        var item = carrinho.adicionar(produto.id(), tamanho.id(), tamanho.sigla(),
                requisicao.quantidade(), produto.preco());
        repository.flush();
        return ItemResposta.de(item);
    }

    @Transactional
    public void remover(String clienteSub, long itemId) {
        var carrinho = repository.findByClienteSub(clienteSub)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Carrinho vazio"));
        if (!carrinho.remover(itemId)) {
            throw new ResponseStatusException(NOT_FOUND, "Item não está no seu carrinho");
        }
    }
}
