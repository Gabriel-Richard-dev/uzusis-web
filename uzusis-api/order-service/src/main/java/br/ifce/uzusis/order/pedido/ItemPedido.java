package br.ifce.uzusis.order.pedido;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "item_pedido")
public class ItemPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;

    @Column(name = "produto_id", nullable = false)
    private long produtoId;

    @Column(name = "tamanho_id", nullable = false)
    private long tamanhoId;

    @Column(nullable = false, length = 2)
    private String sigla;

    @Column(nullable = false)
    private int quantidade;

    /** Preço, nome e foto do catálogo no momento da compra, não os de hoje. */
    @Column(name = "valor_unitario", nullable = false, precision = 19, scale = 4)
    private BigDecimal valorUnitario;

    @Column(name = "nome_produto", length = 120)
    private String nomeProduto;

    @Column(name = "foto_url", length = 500)
    private String fotoUrl;

    protected ItemPedido() {
    }

    ItemPedido(Pedido pedido, long produtoId, long tamanhoId, String sigla, int quantidade,
               BigDecimal valorUnitario, String nomeProduto, String fotoUrl) {
        this.pedido = pedido;
        this.produtoId = produtoId;
        this.tamanhoId = tamanhoId;
        this.sigla = sigla;
        this.quantidade = quantidade;
        this.valorUnitario = valorUnitario;
        this.nomeProduto = nomeProduto;
        this.fotoUrl = fotoUrl;
    }

    public BigDecimal getValorTotal() {
        return valorUnitario.multiply(BigDecimal.valueOf(quantidade));
    }

    public Pedido getPedido() {
        return pedido;
    }

    public Long getId() {
        return id;
    }

    public long getProdutoId() {
        return produtoId;
    }

    public long getTamanhoId() {
        return tamanhoId;
    }

    public String getSigla() {
        return sigla;
    }

    public int getQuantidade() {
        return quantidade;
    }

    public BigDecimal getValorUnitario() {
        return valorUnitario;
    }

    public String getNomeProduto() {
        return nomeProduto;
    }

    public String getFotoUrl() {
        return fotoUrl;
    }
}
