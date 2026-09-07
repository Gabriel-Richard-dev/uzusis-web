package br.ifce.uzusis.catalog.produto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Sem MapStruct: para DTO que é record, um método de fábrica estático é menos
 * peça móvel que um processador de anotação. Entra MapStruct quando houver
 * mapeamento com regra, não cópia de campo.
 */
public final class ProdutoDtos {

    public record TamanhoResposta(Long id, String sigla, int quantidade) {
        static TamanhoResposta de(Tamanho tamanho) {
            return new TamanhoResposta(tamanho.getId(), tamanho.getSigla(), tamanho.getQuantidade());
        }
    }

    public record ProdutoResposta(
            Long id,
            String nome,
            BigDecimal preco,
            String descricao,
            CategoriaProduto categoria,
            boolean disponivel,
            List<TamanhoResposta> tamanhos,
            List<String> fotos) {

        public static ProdutoResposta de(Produto produto) {
            return new ProdutoResposta(
                    produto.getId(),
                    produto.getNome(),
                    produto.getPreco(),
                    produto.getDescricao(),
                    produto.getCategoria(),
                    produto.isDisponivel(),
                    produto.getTamanhos().stream().map(TamanhoResposta::de).toList(),
                    produto.getFotos().stream().map(Foto::getUrl).toList());
        }
    }

    public record TamanhoRequisicao(
            @NotBlank @Pattern(regexp = "[PMGpmg]", message = "sigla deve ser P, M ou G") String sigla,
            @Min(0) int quantidade) {
    }

    public record CriarProduto(
            @NotBlank @Size(max = 120) String nome,
            @NotNull @DecimalMin(value = "0.01") BigDecimal preco,
            @NotBlank @Size(max = 2000) String descricao,
            @NotNull CategoriaProduto categoria,
            @Valid List<TamanhoRequisicao> tamanhos) {
    }

    public record AtualizarProduto(
            @Size(max = 120) String nome,
            @DecimalMin(value = "0.01") BigDecimal preco,
            @Size(max = 2000) String descricao,
            CategoriaProduto categoria) {
    }

    private ProdutoDtos() {
    }
}
