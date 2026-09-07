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

    public record OrderPaid(long orderId, String clienteSub, String clienteEmail, long valorTotalCentavos) {
    }

    public record OrderCancelled(long orderId, String clienteSub, String clienteEmail, String motivo) {
    }

    /** Compensação da saga: o pedido caiu depois de pago, a Stripe tem que estornar. */
    public record RefundRequested(long orderId, String paymentIntentId, String motivo) {
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
