package br.ifce.uzusis.identity.perfil;

import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarEndereco;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.Locale;

@Embeddable
public class Endereco {

    @Column(length = 9)
    private String cep;

    @Column(length = 200)
    private String rua;

    @Column(length = 20)
    private String numero;

    @Column(length = 100)
    private String complemento;

    @Column(length = 100)
    private String bairro;

    @Column(length = 100)
    private String cidade;

    /** A coluna continua {@code estado}; na API o nome é {@code uf}, o mesmo do pedido. */
    @Column(name = "estado", length = 2)
    private String uf;

    protected Endereco() {
    }

    /** Campos {@code null} ficam como estão; {@code complemento} vazio limpa. Entrada já validada. */
    void atualizar(AtualizarEndereco novo) {
        if (novo.cep() != null) {
            var digitos = novo.cep().replace("-", "");
            this.cep = digitos.substring(0, 5) + "-" + digitos.substring(5);
        }
        if (novo.rua() != null) {
            this.rua = novo.rua();
        }
        if (novo.numero() != null) {
            this.numero = novo.numero();
        }
        if (novo.complemento() != null) {
            this.complemento = novo.complemento().isBlank() ? null : novo.complemento();
        }
        if (novo.bairro() != null) {
            this.bairro = novo.bairro();
        }
        if (novo.cidade() != null) {
            this.cidade = novo.cidade();
        }
        if (novo.uf() != null) {
            this.uf = novo.uf().toUpperCase(Locale.ROOT);
        }
    }

    public String getCep() {
        return cep;
    }

    public String getRua() {
        return rua;
    }

    public String getNumero() {
        return numero;
    }

    public String getComplemento() {
        return complemento;
    }

    public String getBairro() {
        return bairro;
    }

    public String getCidade() {
        return cidade;
    }

    public String getUf() {
        return uf;
    }
}
