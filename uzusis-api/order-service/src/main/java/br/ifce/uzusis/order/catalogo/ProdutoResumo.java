package br.ifce.uzusis.order.catalogo;

import java.math.BigDecimal;
import java.util.List;

/**
 * O que o pedido precisa saber sobre um produto. É uma projeção da resposta do
 * catalog-service, não a entidade dele: o pedido nunca lê a tabela do catálogo,
 * chama a API do dono. Sem {@code ativo}: a chamada é anônima, e o catálogo
 * responde 404 para produto inativo.
 */
public record ProdutoResumo(Long id, String nome, BigDecimal preco, List<Tamanho> tamanhos, List<Foto> fotos) {

    public record Tamanho(Long id, String sigla, int quantidade) {
    }

    public record Foto(String url) {
    }

    public Tamanho tamanhoPorSigla(String sigla) {
        return tamanhos.stream()
                .filter(tamanho -> tamanho.sigla().equalsIgnoreCase(sigla))
                .findFirst()
                .orElse(null);
    }

    public Tamanho tamanhoPorId(long tamanhoId) {
        return tamanhos.stream()
                .filter(tamanho -> tamanho.id() == tamanhoId)
                .findFirst()
                .orElse(null);
    }

    /** A capa: o catálogo devolve as fotos já ordenadas. */
    public String fotoUrl() {
        return fotos == null || fotos.isEmpty() ? null : fotos.get(0).url();
    }
}
