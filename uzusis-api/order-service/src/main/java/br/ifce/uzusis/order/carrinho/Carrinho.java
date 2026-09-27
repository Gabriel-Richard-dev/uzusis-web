package br.ifce.uzusis.order.carrinho;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** A sacola: uma linha por tamanho, então adicionar de novo soma na linha. */
@Entity
@Table(name = "carrinho")
public class Carrinho {

    public static final int MAXIMO_POR_ITEM = 99;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cliente_sub", nullable = false, unique = true, length = 64)
    private String clienteSub;

    @OneToMany(mappedBy = "carrinho", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    @BatchSize(size = 50)
    private List<ItemCarrinho> itens = new ArrayList<>();

    protected Carrinho() {
    }

    public Carrinho(String clienteSub) {
        this.clienteSub = clienteSub;
    }

    /** A linha deste tamanho, ou null. */
    public ItemCarrinho linhaDo(long tamanhoId) {
        return itens.stream().filter(item -> item.getTamanhoId() == tamanhoId).findFirst().orElse(null);
    }

    /** A linha com este id, ou null: quem não é dono da sacola não acha nada. */
    public ItemCarrinho item(long itemId) {
        return itens.stream().filter(item -> item.getId() != null && item.getId() == itemId).findFirst().orElse(null);
    }

    public ItemCarrinho novaLinha(long produtoId, long tamanhoId, String sigla) {
        var item = new ItemCarrinho(this, produtoId, tamanhoId, sigla);
        itens.add(item);
        return item;
    }

    /**
     * Itens de um pedido cancelado voltando: soma na linha do mesmo tamanho,
     * com o preço, o nome e a foto do pedido. O O6 revalida tudo depois.
     */
    public void devolver(long produtoId, long tamanhoId, String sigla, int quantidade,
                         BigDecimal valorUnitario, String nomeProduto, String fotoUrl) {
        var linha = linhaDo(tamanhoId);
        if (linha == null) {
            linha = novaLinha(produtoId, tamanhoId, sigla);
        }
        linha.atualizar(Math.min(MAXIMO_POR_ITEM, linha.getQuantidade() + quantidade),
                valorUnitario, nomeProduto, fotoUrl);
    }

    public boolean remover(long itemId) {
        return itens.removeIf(item -> item.getId() != null && item.getId() == itemId);
    }

    public void esvaziar() {
        itens.clear();
    }

    public Long getId() {
        return id;
    }

    public String getClienteSub() {
        return clienteSub;
    }

    public List<ItemCarrinho> getItens() {
        return itens;
    }
}
