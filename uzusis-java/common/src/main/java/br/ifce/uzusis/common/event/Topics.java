package br.ifce.uzusis.common.event;

/**
 * Nomes de tópico: {@code <domínio>.<agregado>.<evento>.v<versão>}.
 * Ficam aqui porque produtor e consumidor moram em serviços diferentes e um
 * erro de digitação num deles vira uma mensagem que nunca chega — sem erro.
 */
public final class Topics {

    public static final String ORDER_CREATED = "order.order.created.v1";
    public static final String ORDER_PAID = "order.order.paid.v1";
    public static final String ORDER_CANCELLED = "order.order.cancelled.v1";
    public static final String ORDER_REFUND_REQUESTED = "order.order.refund-requested.v1";

    public static final String STOCK_RESERVED = "catalog.stock.reserved.v1";
    public static final String STOCK_REJECTED = "catalog.stock.rejected.v1";

    public static final String PAYMENT_SUCCEEDED = "payment.payment.succeeded.v1";
    public static final String PAYMENT_FAILED = "payment.payment.failed.v1";
    public static final String PAYMENT_REFUNDED = "payment.payment.refunded.v1";

    /** Tópico de mensagem envenenada: {@code <original>.dlq}. */
    public static String dlqOf(String topic) {
        return topic + ".dlq";
    }

    private Topics() {
    }
}
