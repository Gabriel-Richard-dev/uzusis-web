package br.ifce.uzusis.order.pedido;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public final class PedidoDtos {

    public record ItemResposta(
            Long id,
            long produtoId,
            long tamanhoId,
            String sigla,
            int quantidade,
            BigDecimal valorUnitario,
            BigDecimal valorTotal,
            boolean enviado,
            boolean recebido) {

        public static ItemResposta de(ItemPedido item) {
            return new ItemResposta(item.getId(), item.getProdutoId(), item.getTamanhoId(), item.getSigla(),
                    item.getQuantidade(), item.getValorUnitario(), item.getValorTotal(),
                    item.isEnviado(), item.isRecebido());
        }
    }

    public record PedidoResposta(
            Long id,
            StatusPedido status,
            BigDecimal valorTotal,
            String motivoCancelamento,
            OffsetDateTime criadoEm,
            List<ItemResposta> itens) {

        public static PedidoResposta de(Pedido pedido) {
            return new PedidoResposta(
                    pedido.getId(),
                    pedido.getStatus(),
                    pedido.getValorTotal(),
                    pedido.getMotivoCancelamento(),
                    pedido.getCriadoEm(),
                    pedido.getItens().stream().map(ItemResposta::de).toList());
        }
    }

    private PedidoDtos() {
    }
}
