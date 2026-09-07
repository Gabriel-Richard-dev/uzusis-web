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

    /** Caminho no MinIO, servido pelo nginx em /storage — igual ao .NET. */
    @Column(nullable = false, length = 500)
    private String url;

    protected Foto() {
    }

    public Long getId() {
        return id;
    }

    public String getUrl() {
        return url;
    }
}
