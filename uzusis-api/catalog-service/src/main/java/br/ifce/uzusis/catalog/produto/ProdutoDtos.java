package br.ifce.uzusis.catalog.produto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

/**
 * Sem MapStruct: para DTO que é record, um método de fábrica estático é menos
 * peça móvel que um processador de anotação. Entra MapStruct quando houver
 * mapeamento com regra, não cópia de campo.
 *
 * <p>Toda constraint tem mensagem explícita em pt-BR: é o texto que o front mostra.
 */
public final class ProdutoDtos {

    public record TamanhoResposta(Long id, String sigla, int quantidade) {
        static TamanhoResposta de(Tamanho tamanho) {
            return new TamanhoResposta(tamanho.getId(), tamanho.getSigla(), tamanho.getQuantidade());
        }
    }

    public record FotoResposta(Long id, String url, int ordem) {
        static FotoResposta de(Foto foto) {
            return new FotoResposta(foto.getId(), foto.getUrl(), foto.getOrdem());
        }
    }

    public record CategoriaResposta(String valor, String nome) {
    }

    public record ProdutoResposta(
            Long id,
            String nome,
            BigDecimal preco,
            String descricao,
            CategoriaProduto categoria,
            String categoriaNome,
            boolean ativo,
            boolean disponivel,
            OffsetDateTime criadoEm,
            List<TamanhoResposta> tamanhos,
            List<FotoResposta> fotos) {

        public static ProdutoResposta de(Produto produto) {
            return new ProdutoResposta(
                    produto.getId(),
                    produto.getNome(),
                    produto.getPreco().setScale(2, RoundingMode.HALF_UP),
                    produto.getDescricao(),
                    produto.getCategoria(),
                    produto.getCategoria().getNomeExibicao(),
                    produto.isAtivo(),
                    produto.isDisponivel(),
                    produto.getCriadoEm(),
                    produto.getTamanhos().stream()
                            .sorted(Comparator.comparingInt(t -> Tamanho.SIGLAS.indexOf(t.getSigla())))
                            .map(TamanhoResposta::de)
                            .toList(),
                    produto.fotosEmOrdem().stream().map(FotoResposta::de).toList());
        }
    }

    public record TamanhoRequisicao(
            @NotNull(message = "sigla é obrigatória")
            @Pattern(regexp = "(?i)PP|P|M|G|GG", message = "sigla deve ser PP, P, M, G ou GG")
            String sigla,
            @NotNull(message = "quantidade é obrigatória")
            @Min(value = 0, message = "quantidade deve ser de 0 a 9999")
            @Max(value = 9999, message = "quantidade deve ser de 0 a 9999")
            Integer quantidade) {
    }

    public record CriarProduto(
            @NotBlank(message = "nome é obrigatório")
            @Size(max = 120, message = "nome deve ter até 120 caracteres")
            String nome,
            @NotNull(message = "preço é obrigatório")
            @DecimalMin(value = "0.01", message = "preço deve ser de pelo menos 0,01")
            @Digits(integer = 15, fraction = 2, message = "preço deve ter até 2 casas decimais")
            BigDecimal preco,
            @NotBlank(message = "descrição é obrigatória")
            @Size(max = 2000, message = "descrição deve ter até 2000 caracteres")
            String descricao,
            @NotNull(message = "categoria é obrigatória")
            CategoriaProduto categoria,
            @NotEmpty(message = "informe ao menos um tamanho")
            List<@NotNull(message = "tamanho não pode ser nulo") @Valid TamanhoRequisicao> tamanhos) {
    }

    /** {@code null} = não altera. Texto enviado não pode ser só espaço. */
    public record AtualizarProduto(
            @Size(max = 120, message = "nome deve ter até 120 caracteres")
            @Pattern(regexp = "(?s).*\\S.*", message = "nome não pode ficar em branco")
            String nome,
            @DecimalMin(value = "0.01", message = "preço deve ser de pelo menos 0,01")
            @Digits(integer = 15, fraction = 2, message = "preço deve ter até 2 casas decimais")
            BigDecimal preco,
            @Size(max = 2000, message = "descrição deve ter até 2000 caracteres")
            @Pattern(regexp = "(?s).*\\S.*", message = "descrição não pode ficar em branco")
            String descricao,
            CategoriaProduto categoria,
            Boolean ativo) {
    }

    public record AtualizarEstoque(
            @NotEmpty(message = "informe ao menos um tamanho")
            List<@NotNull(message = "tamanho não pode ser nulo") @Valid TamanhoRequisicao> tamanhos) {
    }

    public record OrdemFotos(@NotNull(message = "fotoIds é obrigatório") List<Long> fotoIds) {
    }

    private ProdutoDtos() {
    }
}
