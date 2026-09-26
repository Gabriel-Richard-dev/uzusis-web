package br.ifce.uzusis.catalog.estoque;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * O que o catálogo baixou para cada pedido. Existe para a compensação da saga:
 * quando o pedido é cancelado, o estoque devolve exatamente o que reservou, em
 * vez de confiar na lista de itens que vem no evento de cancelamento — que
 * pode ter sido editada, ou nem vir.
 *
 * <p>Nenhum serviço lê a tabela de outro: o catálogo é dono deste dado e
 * mantém a própria cópia do que o pedido pediu.
 */
@Entity
@Table(name = "reserva_estoque")
public class ReservaEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private long orderId;

    @Column(name = "tamanho_id", nullable = false)
    private long tamanhoId;

    @Column(nullable = false)
    private int quantidade;

    @Column(nullable = false)
    private boolean liberada;

    protected ReservaEstoque() {
    }

    ReservaEstoque(long orderId, long tamanhoId, int quantidade) {
        this.orderId = orderId;
        this.tamanhoId = tamanhoId;
        this.quantidade = quantidade;
    }

    void liberar() {
        this.liberada = true;
    }

    long getTamanhoId() {
        return tamanhoId;
    }

    int getQuantidade() {
        return quantidade;
    }
}
