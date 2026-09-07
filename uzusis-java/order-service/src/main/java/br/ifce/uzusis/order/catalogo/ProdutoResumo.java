package br.ifce.uzusis.order.catalogo;

import java.math.BigDecimal;
import java.util.List;

/**
 * O que o pedido precisa saber sobre um produto. É uma projeção da resposta do
 * catalog-service, não a entidade dele: o pedido nunca lê a tabela do catálogo,
 * chama a API do dono.
 */
public record ProdutoResumo(Long id, String nome, BigDecimal preco, boolean disponivel, List<Tamanho> tamanhos) {

    public record Tamanho(Long id, String sigla, int quantidade) {
    }

    public Tamanho tamanhoPorSigla(String sigla) {
        return tamanhos.stream()
                .filter(tamanho -> tamanho.sigla().equalsIgnoreCase(sigla))
                .findFirst()
                .orElse(null);
    }
}
