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
 * A linha do carrinho — o que o .NET chamava de {@code Pedido}. O preço é
 * copiado na hora de adicionar: se o admin mudar o preço enquanto o cliente
 * decide, vale o preço que ele viu.
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

    protected ItemCarrinho() {
    }

    ItemCarrinho(Carrinho carrinho, long produtoId, long tamanhoId, String sigla, int quantidade, BigDecimal valorUnitario) {
        this.carrinho = carrinho;
        this.produtoId = produtoId;
        this.tamanhoId = tamanhoId;
        this.sigla = sigla.toUpperCase();
        this.quantidade = quantidade;
        this.valorUnitario = valorUnitario;
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
}
