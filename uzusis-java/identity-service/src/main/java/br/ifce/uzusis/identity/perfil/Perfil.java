package br.ifce.uzusis.identity.perfil;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "perfil")
public class Perfil {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Vínculo com o usuário do Keycloak. É a chave natural do perfil. */
    @Column(nullable = false, unique = true, length = 64)
    private String sub;

    /**
     * Cópia do e-mail do token, para consulta e suporte. O dono do dado é o
     * Keycloak — se divergir, o token é quem está certo.
     *
     * <p>Guardado em minúsculo: o MySQL antigo comparava e-mail sem diferenciar
     * caixa por causa da collation, o Postgres diferencia. Normalizar aqui é o
     * que evita o cadastro duplicado que só aparece depois.
     */
    @Column(nullable = false, length = 200)
    private String email;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(length = 14)
    private String cpf;

    @Column(length = 20)
    private String celular;

    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    @Embedded
    private Endereco endereco = new Endereco();

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm = OffsetDateTime.now();

    @Column(name = "atualizado_em")
    private OffsetDateTime atualizadoEm;

    protected Perfil() {
    }

    public Perfil(String sub, String email, String nome) {
        this.sub = sub;
        this.email = email.toLowerCase();
        this.nome = nome;
    }

    public void atualizar(String nome, String cpf, String celular, LocalDate dataNascimento) {
        if (nome != null) {
            this.nome = nome;
        }
        if (cpf != null) {
            this.cpf = cpf;
        }
        if (celular != null) {
            this.celular = celular;
        }
        if (dataNascimento != null) {
            this.dataNascimento = dataNascimento;
        }
        this.atualizadoEm = OffsetDateTime.now();
    }

    public void atualizarEndereco(String cep, String rua, String numero, String bairro, String cidade, String estado) {
        endereco.atualizar(cep, rua, numero, bairro, cidade, estado);
        this.atualizadoEm = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getSub() {
        return sub;
    }

    public String getEmail() {
        return email;
    }

    public String getNome() {
        return nome;
    }

    public String getCpf() {
        return cpf;
    }

    public String getCelular() {
        return celular;
    }

    public LocalDate getDataNascimento() {
        return dataNascimento;
    }

    public Endereco getEndereco() {
        return endereco;
    }
}
