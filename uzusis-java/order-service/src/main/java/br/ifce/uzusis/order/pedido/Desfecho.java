package br.ifce.uzusis.order.pedido;

/**
 * O que a saga decidiu depois de receber mais uma resposta. Existe para o
 * pedido decidir sozinho, sem que o serviço tenha que reconstruir a regra a
 * cada evento que chega.
 */
public enum Desfecho {

    /** Ainda falta resposta de alguém. Nada a publicar. */
    PENDENTE,

    PAGAR,

    CANCELAR,

    /** Cancelar e mandar a Stripe estornar: o dinheiro já entrou. */
    CANCELAR_COM_ESTORNO
}
