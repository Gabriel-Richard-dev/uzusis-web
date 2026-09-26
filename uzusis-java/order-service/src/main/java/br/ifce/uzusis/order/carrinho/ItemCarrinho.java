package br.ifce.uzusis.order.carrinho;

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

/**
 * A linha da sacola — o que o .NET chamava de {@code Pedido}. Preço, nome e
 * foto são uma cópia do catálogo, atualizada a cada vez que o cliente mexe na
 * linha; o pedido (O6) relê o catálogo e cobra o preço daquele momento.
 */
@Entity
@Table(name = "item_carrinho")
public class ItemCarrinho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "carrinho_id", nullable = false)
    private Carrinho carrinho;

    @Column(name = "produto_id", nullable = false)
    private long produtoId;

    @Column(name = "tamanho_id", nullable = false)
    private long tamanhoId;

    @Column(nullable = false, length = 2)
    private String sigla;

    @Column(nullable = false)
    private int quantidade;

    @Column(name = "valor_unitario", nullable = false, precision = 19, scale = 4)
    private BigDecimal valorUnitario;

    @Column(name = "nome_produto", length = 120)
    private String nomeProduto;

    @Column(name = "foto_url", length = 500)
    private String fotoUrl;

    protected ItemCarrinho() {
    }

    ItemCarrinho(Carrinho carrinho, long produtoId, long tamanhoId, String sigla) {
        this.carrinho = carrinho;
        this.produtoId = produtoId;
        this.tamanhoId = tamanhoId;
        this.sigla = sigla.toUpperCase();
    }

    public void atualizar(int quantidade, BigDecimal valorUnitario, String nomeProduto, String fotoUrl) {
        this.quantidade = quantidade;
        this.valorUnitario = valorUnitario;
        this.nomeProduto = nomeProduto;
        this.fotoUrl = fotoUrl;
    }

    public BigDecimal getValorTotal() {
        return valorUnitario.multiply(BigDecimal.valueOf(quantidade));
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
