package br.ifce.uzusis.order.carrinho;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "carrinho")
public class Carrinho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cliente_sub", nullable = false, unique = true, length = 64)
    private String clienteSub;

    @OneToMany(mappedBy = "carrinho", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    private List<ItemCarrinho> itens = new ArrayList<>();

    protected Carrinho() {
    }

    public Carrinho(String clienteSub) {
        this.clienteSub = clienteSub;
    }

    public ItemCarrinho adicionar(long produtoId, long tamanhoId, String sigla, int quantidade, BigDecimal valorUnitario) {
        var item = new ItemCarrinho(this, produtoId, tamanhoId, sigla, quantidade, valorUnitario);
        itens.add(item);
        return item;
    }

    public boolean remover(long itemId) {
        return itens.removeIf(item -> item.getId() != null && item.getId() == itemId);
    }

    /** Quanto deste tamanho o cliente já tem no carrinho. */
    public int quantidadeReservadaDe(long tamanhoId) {
        return itens.stream()
                .filter(item -> item.getTamanhoId() == tamanhoId)
                .mapToInt(ItemCarrinho::getQuantidade)
                .sum();
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
