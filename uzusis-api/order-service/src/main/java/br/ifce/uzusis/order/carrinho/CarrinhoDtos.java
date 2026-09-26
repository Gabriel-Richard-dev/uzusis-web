package br.ifce.uzusis.order.carrinho;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public final class CarrinhoDtos {

    public record AdicionarItem(
            @Positive(message = "produtoId deve ser maior que zero") long produtoId,
            @NotNull(message = "Informe o tamanho")
            @Pattern(regexp = "(?i)PP|P|M|G|GG", message = "sigla deve ser PP, P, M, G ou GG") String sigla,
            @Min(value = 1, message = "quantidade deve ser de 1 a 99")
            @Max(value = 99, message = "quantidade deve ser de 1 a 99") int quantidade) {
    }

    public record AlterarQuantidade(
            @Min(value = 1, message = "quantidade deve ser de 1 a 99")
            @Max(value = 99, message = "quantidade deve ser de 1 a 99") int quantidade) {
    }

    /** Linha da sacola; os itens do pedido saem no mesmo formato. */
    public record ItemResposta(
            Long id,
            long produtoId,
            long tamanhoId,
            String sigla,
            int quantidade,
            BigDecimal valorUnitario,
            BigDecimal valorTotal,
            String nomeProduto,
            String fotoUrl) {

        public ItemResposta {
            valorUnitario = valorUnitario.setScale(2, RoundingMode.HALF_UP);
            valorTotal = valorTotal.setScale(2, RoundingMode.HALF_UP);
        }

        static ItemResposta de(ItemCarrinho item) {
            return new ItemResposta(item.getId(), item.getProdutoId(), item.getTamanhoId(), item.getSigla(),
                    item.getQuantidade(), item.getValorUnitario(), item.getValorTotal(),
                    item.getNomeProduto(), item.getFotoUrl());
        }
    }

    public record CarrinhoResposta(List<ItemResposta> itens, int quantidadeItens, BigDecimal valorTotal) {

        public static CarrinhoResposta de(Carrinho carrinho) {
            return new CarrinhoResposta(
                    carrinho.getItens().stream().map(ItemResposta::de).toList(),
                    carrinho.getItens().stream().mapToInt(ItemCarrinho::getQuantidade).sum(),
                    carrinho.getItens().stream()
                            .map(ItemCarrinho::getValorTotal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .setScale(2, RoundingMode.HALF_UP));
        }
    }

    private CarrinhoDtos() {
    }
}
