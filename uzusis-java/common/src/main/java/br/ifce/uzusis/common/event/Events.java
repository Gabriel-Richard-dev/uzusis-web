package br.ifce.uzusis.common.event;

import java.util.List;

/**
 * Contratos de evento. São específicos de propósito — nada de
 * {@code EntityChanged} genérico, que obriga todo consumidor a adivinhar o que
 * mudou.
 *
 * <p>Duas convenções que valem para todos:
 * <ul>
 *   <li>Dinheiro em centavos e {@code long}, nunca double. É o formato da
 *       Stripe e o que não perde arredondamento no caminho.</li>
 *   <li>O cliente é identificado pelo {@code sub} do token do Keycloak, não
 *       por um id de tabela. O id do MySQL antigo não sobrevive à migração;
 *       o sub sobrevive.</li>
 * </ul>
 */
public final class Events {

    public record Item(long produtoId, long tamanhoId, String sigla, int quantidade, long valorUnitarioCentavos) {
    }

    public record OrderCreated(
            long orderId,
            String clienteSub,
            String clienteEmail,
            long valorTotalCentavos,
            List<Item> itens) {
    }

    public record EnderecoEntrega(
            String destinatario,
            String telefone,
            String cep,
            String rua,
            String numero,
            String complemento,
            String bairro,
            String cidade,
            String uf) {
    }

    /** Item como o e-mail mostra: sem ids, com o nome gravado no pedido. */
    public record ItemResumo(String nomeProduto, String sigla, int quantidade, long valorTotalCentavos) {
    }

    /** {@code valorTotalCentavos} já inclui o frete. */
    public record OrderPaid(
            long orderId,
            String clienteSub,
            String clienteEmail,
            String clienteNome,
            long valorTotalCentavos,
            long freteCentavos,
            List<ItemResumo> itens,
            EnderecoEntrega endereco) {
    }

    /**
     * Também é a compensação da saga: o payment cancela o intent ou estorna.
     * {@code sacolaRestaurada} diz se os itens voltaram para a sacola; ninguém
     * interpreta o texto do motivo.
     */
    public record OrderCancelled(
            long orderId,
            String clienteSub,
            String clienteEmail,
            String clienteNome,
            String motivo,
            boolean sacolaRestaurada) {
    }

    public record OrderShipped(
            long orderId,
            String clienteSub,
            String clienteEmail,
            String clienteNome,
            List<ItemResumo> itens,
            EnderecoEntrega endereco) {
    }

    public record StockReserved(long orderId, List<Item> itens) {
    }

    public record StockRejected(long orderId, String motivo) {
    }

    public record PaymentSucceeded(long orderId, String paymentIntentId, String chargeId, long valorCentavos) {
    }

    public record PaymentFailed(long orderId, String paymentIntentId, String motivo) {
    }

    public record PaymentRefunded(long orderId, String paymentIntentId, String refundId, long valorCentavos) {
    }

    private Events() {
    }
}
