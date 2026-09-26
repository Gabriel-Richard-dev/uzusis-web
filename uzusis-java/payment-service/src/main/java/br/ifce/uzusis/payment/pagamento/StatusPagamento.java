package br.ifce.uzusis.payment.pagamento;

public enum StatusPagamento {
    CRIADO,
    CONFIRMADO,
    FALHOU,
    /** O pedido foi cancelado antes de pagar: o intent não aceita mais cobrança. */
    CANCELADO,
    ESTORNADO
}
