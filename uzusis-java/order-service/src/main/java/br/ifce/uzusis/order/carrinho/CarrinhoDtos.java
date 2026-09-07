package br.ifce.uzusis.order.carrinho;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public final class CarrinhoDtos {

    public record AdicionarItem(
            @Positive long produtoId,
            // Mesma regra do .NET: só P, M ou G. A validação vem para a borda
            // (Bean Validation) em vez de ficar num if no meio do serviço.
            @NotBlank @Pattern(regexp = "[PMGpmg]", message = "sigla deve ser P, M ou G") String sigla,
            @Min(1) int quantidade) {
    }

    public record ItemResposta(
            Long id,
            long produtoId,
            long tamanhoId,
            String sigla,
            int quantidade,
            BigDecimal valorUnitario,
            BigDecimal valorTotal) {

        static ItemResposta de(ItemCarrinho item) {
            return new ItemResposta(item.getId(), item.getProdutoId(), item.getTamanhoId(), item.getSigla(),
                    item.getQuantidade(), item.getValorUnitario(), item.getValorTotal());
        }
    }

    public record CarrinhoResposta(List<ItemResposta> itens, BigDecimal valorTotal) {

        public static CarrinhoResposta de(Carrinho carrinho) {
            return new CarrinhoResposta(
                    carrinho.getItens().stream().map(ItemResposta::de).toList(),
                    carrinho.getItens().stream()
                            .map(ItemCarrinho::getValorTotal)
                            .reduce(BigDecimal.ZERO, BigDecimal::add));
        }
    }

    private CarrinhoDtos() {
    }
}
