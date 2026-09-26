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

    /**
     * Cancelar. Se o dinheiro já entrou, quem estorna é o payment-service ao
     * consumir order.cancelled: é o único caminho de estorno.
     */
    CANCELAR
}
