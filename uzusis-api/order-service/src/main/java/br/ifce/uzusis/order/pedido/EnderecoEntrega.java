package br.ifce.uzusis.order.pedido;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Endereço de entrega copiado para o pedido: mudar o perfil depois não muda
 * para onde um pedido já pago vai. O mesmo record é a entrada do O6, a saída
 * do pedido e as colunas {@code entrega_*}.
 */
@Embeddable
public record EnderecoEntrega(
        @Column(name = "entrega_destinatario", length = 200)
        @NotBlank(message = "Informe o destinatário")
        @Size(max = 200, message = "Destinatário deve ter até 200 caracteres") String destinatario,

        // Opcional: vazio conta como ausente.
        @Column(name = "entrega_telefone", length = 11)
        @Pattern(regexp = "(?:[\\s().-]*\\d){10,11}[\\s().-]*|\\s*",
                message = "Telefone inválido (DDD + número)") String telefone,

        @Column(name = "entrega_cep", length = 9)
        @NotNull(message = "Informe o CEP")
        @Pattern(regexp = "\\d{5}-?\\d{3}", message = "CEP inválido") String cep,

        @Column(name = "entrega_rua", length = 200)
        @NotBlank(message = "Informe a rua")
        @Size(max = 200, message = "Rua deve ter até 200 caracteres") String rua,

        @Column(name = "entrega_numero", length = 20)
        @NotBlank(message = "Informe o número")
        @Size(max = 20, message = "Número deve ter até 20 caracteres") String numero,

        @Column(name = "entrega_complemento", length = 100)
        @Size(max = 100, message = "Complemento deve ter até 100 caracteres") String complemento,

        @Column(name = "entrega_bairro", length = 100)
        @NotBlank(message = "Informe o bairro")
        @Size(max = 100, message = "Bairro deve ter até 100 caracteres") String bairro,

        @Column(name = "entrega_cidade", length = 100)
        @NotBlank(message = "Informe a cidade")
        @Size(max = 100, message = "Cidade deve ter até 100 caracteres") String cidade,

        @Column(name = "entrega_uf", length = 2)
        @NotNull(message = "Informe a UF")
        @Pattern(regexp = EnderecoEntrega.UF, message = "UF inválida") String uf) {

    public static final String UF =
            "(?i)AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO";

    /** Como é gravado: CEP 00000-000, telefone só com dígitos, UF maiúscula. Chame depois de validar. */
    public EnderecoEntrega normalizado() {
        var digitosCep = cep.replace("-", "");
        return new EnderecoEntrega(destinatario.trim(), opcional(telefone == null ? null : telefone.replaceAll("\\D", "")),
                digitosCep.substring(0, 5) + "-" + digitosCep.substring(5), rua.trim(), numero.trim(),
                opcional(complemento), bairro.trim(), cidade.trim(), uf.toUpperCase());
    }

    private static String opcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
