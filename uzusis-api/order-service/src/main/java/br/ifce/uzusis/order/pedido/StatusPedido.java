package br.ifce.uzusis.order.pedido;

/** CRIADO → PAGO → ENVIADO → RECEBIDO, ou CANCELADO enquanto CRIADO. */
public enum StatusPedido {
    CRIADO,
    PAGO,
    ENVIADO,
    RECEBIDO,
    CANCELADO
}
