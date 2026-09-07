package br.ifce.uzusis.identity.perfil;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class Endereco {

    @Column(length = 9)
    private String cep;

    @Column(length = 200)
    private String rua;

    @Column(length = 20)
    private String numero;

    @Column(length = 100)
    private String bairro;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String estado;

    protected Endereco() {
    }

    void atualizar(String cep, String rua, String numero, String bairro, String cidade, String estado) {
        if (cep != null) {
            this.cep = cep;
        }
        if (rua != null) {
            this.rua = rua;
        }
        if (numero != null) {
            this.numero = numero;
        }
        if (bairro != null) {
            this.bairro = bairro;
        }
        if (cidade != null) {
            this.cidade = cidade;
        }
        if (estado != null) {
            this.estado = estado.toUpperCase();
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

    public String getBairro() {
        return bairro;
    }

    public String getCidade() {
        return cidade;
    }

    public String getEstado() {
        return estado;
    }
}
