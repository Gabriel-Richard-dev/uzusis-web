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
@Table(name = "foto")
public class Foto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    /** /storage/{bucket}/{chave}: o nginx serve /storage direto do MinIO. */
    @Column(nullable = false, length = 500)
    private String url;

    /** Objeto no bucket; null em linha antiga, que não tem objeto nosso para apagar. */
    @Column(length = 300)
    private String chave;

    /** 0 é a capa. */
    @Column(nullable = false)
    private int ordem;

    protected Foto() {
    }

    Foto(Produto produto, String url, String chave, int ordem) {
        this.produto = produto;
        this.url = url;
        this.chave = chave;
        this.ordem = ordem;
    }

    void definirOrdem(int ordem) {
        this.ordem = ordem;
    }

    public Long getId() {
        return id;
    }

    public String getUrl() {
        return url;
    }

    public String getChave() {
        return chave;
    }

    public int getOrdem() {
        return ordem;
    }
}
