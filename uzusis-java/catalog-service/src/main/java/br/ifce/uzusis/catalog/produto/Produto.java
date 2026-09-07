package br.ifce.uzusis.catalog.produto;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "produto")
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    /** decimal do C# vira BigDecimal e NUMERIC(19,4) — nunca double. */
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal preco;

    @Column(nullable = false, length = 2000)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CategoriaProduto categoria;

    // O LINQ com lazy loading do EF virava N+1 silencioso aqui. @BatchSize
    // carrega as coleções de até 50 produtos em uma consulta cada, sem o
    // problema de paginar em memória que o JOIN FETCH traria.
    @OneToMany(mappedBy = "produto", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    private List<Tamanho> tamanhos = new ArrayList<>();

    @OneToMany(mappedBy = "produto", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    private List<Foto> fotos = new ArrayList<>();

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm = OffsetDateTime.now();

    @Column(name = "atualizado_em")
    private OffsetDateTime atualizadoEm;

    protected Produto() {
    }

    public Produto(String nome, BigDecimal preco, String descricao, CategoriaProduto categoria) {
        this.nome = nome;
        this.preco = preco;
        this.descricao = descricao;
        this.categoria = categoria;
    }

    /**
     * Disponível se qualquer tamanho tem peça em estoque.
     *
     * Atenção na paridade: o .NET marcava indisponível só quando exatamente 3
     * tamanhos estavam zerados (quantidadeZero == 3), então um produto com 2
     * tamanhos zerados aparecia como disponível e um com 4 tamanhos zerados
     * também. Isso é bug, não regra de negócio — traduzir o bug ia deixar a
     * vitrine mentindo. Se a intenção era outra, é aqui que muda.
     */
    public boolean isDisponivel() {
        return tamanhos.stream().anyMatch(tamanho -> tamanho.getQuantidade() > 0);
    }

    public void atualizar(String nome, BigDecimal preco, String descricao, CategoriaProduto categoria) {
        if (nome != null) {
            this.nome = nome;
        }
        if (preco != null) {
            this.preco = preco;
        }
        if (descricao != null) {
            this.descricao = descricao;
        }
        if (categoria != null) {
            this.categoria = categoria;
        }
        this.atualizadoEm = OffsetDateTime.now();
    }

    public void adicionarTamanho(String sigla, int quantidade) {
        tamanhos.add(new Tamanho(this, sigla, quantidade));
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public BigDecimal getPreco() {
        return preco;
    }

    public String getDescricao() {
        return descricao;
    }

    public CategoriaProduto getCategoria() {
        return categoria;
    }

    public List<Tamanho> getTamanhos() {
        return tamanhos;
    }

    public List<Foto> getFotos() {
        return fotos;
    }
}
