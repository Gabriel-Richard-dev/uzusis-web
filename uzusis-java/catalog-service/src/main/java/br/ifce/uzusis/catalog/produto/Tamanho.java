package br.ifce.uzusis.catalog.produto;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tamanho")
public class Tamanho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    @Column(nullable = false, length = 2)
    private String sigla;

    @Column(nullable = false)
    private int quantidade;

    protected Tamanho() {
    }

    Tamanho(Produto produto, String sigla, int quantidade) {
        this.produto = produto;
        this.sigla = sigla.toUpperCase();
        this.quantidade = quantidade;
    }

    /** @return false se não há peça suficiente — quem chama decide o que fazer. */
    public boolean reservar(int quantidadePedida) {
        if (quantidadePedida <= 0 || quantidade < quantidadePedida) {
            return false;
        }
        quantidade -= quantidadePedida;
        return true;
    }

    public void devolver(int quantidadeDevolvida) {
        quantidade += quantidadeDevolvida;
    }

    public Long getId() {
        return id;
    }

    public String getSigla() {
        return sigla;
    }

    public int getQuantidade() {
        return quantidade;
    }
}
