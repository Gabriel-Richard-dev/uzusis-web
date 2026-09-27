package br.ifce.uzusis.identity.perfil;

import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarEndereco;
import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarPerfil;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Locale;

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

    /** Destinatário padrão da entrega, não o nome da conta (esse é do Keycloak). */
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

    /** Só o e-mail vem do token a cada acesso; o resto é do cliente. */
    public void atualizarEmail(String email) {
        this.email = email.toLowerCase(Locale.ROOT);
    }

    /** Campos {@code null} ficam como estão. Entrada já validada; CPF e celular gravados só com dígitos. */
    public void atualizar(AtualizarPerfil novo) {
        if (novo.nome() != null) {
            this.nome = novo.nome();
        }
        if (novo.cpf() != null) {
            this.cpf = novo.cpf().replaceAll("\\D", "");
        }
        if (novo.celular() != null) {
            this.celular = novo.celular().replaceAll("\\D", "");
        }
        if (novo.dataNascimento() != null) {
            this.dataNascimento = novo.dataNascimento();
        }
        this.atualizadoEm = OffsetDateTime.now();
    }

    public void atualizarEndereco(AtualizarEndereco novo) {
        getEndereco().atualizar(novo);
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
        // O Hibernate carrega como null o embeddable com todas as colunas nulas.
        if (endereco == null) {
            endereco = new Endereco();
        }
        return endereco;
    }
}
