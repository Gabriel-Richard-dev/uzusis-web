package br.ifce.uzusis.order.pedido;

import br.ifce.uzusis.order.carrinho.CarrinhoDtos.ItemResposta;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public final class PedidoDtos {

    public record CriarPedido(@NotNull(message = "Informe o endereço de entrega") @Valid EnderecoEntrega endereco) {
    }

    public record Cliente(String nome, String email) {
    }

    public record PedidoResposta(
            Long id,
            StatusPedido status,
            BigDecimal subtotal,
            BigDecimal frete,
            BigDecimal valorTotal,
            String motivoCancelamento,
            boolean sacolaRestaurada,
            OffsetDateTime criadoEm,
            OffsetDateTime expiraEm,
            OffsetDateTime pagoEm,
            OffsetDateTime enviadoEm,
            OffsetDateTime recebidoEm,
            OffsetDateTime canceladoEm,
            Cliente cliente,
            EnderecoEntrega endereco,
            List<ItemResposta> itens) {

        public static PedidoResposta de(Pedido pedido, int expiracaoMinutos) {
            return new PedidoResposta(
                    pedido.getId(),
                    pedido.getStatus(),
                    reais(pedido.getSubtotal()),
                    reais(pedido.getFrete()),
                    reais(pedido.getValorTotal()),
                    pedido.getMotivoCancelamento(),
                    pedido.isSacolaRestaurada(),
                    pedido.getCriadoEm(),
                    pedido.getStatus() == StatusPedido.CRIADO ? pedido.getCriadoEm().plusMinutes(expiracaoMinutos) : null,
                    pedido.getPagoEm(),
                    pedido.getEnviadoEm(),
                    pedido.getRecebidoEm(),
                    pedido.getCanceladoEm(),
                    new Cliente(pedido.getClienteNome(), pedido.getClienteEmail()),
                    pedido.getEndereco(),
                    pedido.getItens().stream()
                            .map(item -> new ItemResposta(item.getId(), item.getProdutoId(), item.getTamanhoId(),
                                    item.getSigla(), item.getQuantidade(), item.getValorUnitario(),
                                    item.getValorTotal(), item.getNomeProduto(), item.getFotoUrl()))
                            .toList());
        }
    }

    public record FreteResposta(String uf, BigDecimal valor) {
    }

    /** {@code porStatus} traz os 5 status, na ordem do enum, com 0 quando não há. */
    public record Resumo(Map<StatusPedido, Long> porStatus, BigDecimal receitaMes) {
    }

    static BigDecimal reais(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private PedidoDtos() {
    }
}
