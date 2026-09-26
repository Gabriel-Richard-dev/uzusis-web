package br.ifce.uzusis.identity.perfil;

import br.ifce.uzusis.identity.perfil.CpfValidator.Cpf;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public final class PerfilDtos {

    public record EnderecoResposta(String cep, String rua, String numero, String complemento, String bairro,
                                   String cidade, String uf) {

        static EnderecoResposta de(Endereco endereco) {
            return new EnderecoResposta(endereco.getCep(), endereco.getRua(), endereco.getNumero(),
                    endereco.getComplemento(), endereco.getBairro(), endereco.getCidade(), endereco.getUf());
        }
    }

    public record PerfilResposta(
            String sub,
            String email,
            String nome,
            String cpf,
            String celular,
            LocalDate dataNascimento,
            EnderecoResposta endereco) {

        public static PerfilResposta de(Perfil perfil) {
            return new PerfilResposta(perfil.getSub(), perfil.getEmail(), perfil.getNome(), perfil.getCpf(),
                    perfil.getCelular(), perfil.getDataNascimento(), EnderecoResposta.de(perfil.getEndereco()));
        }
    }

    /** {@code null} = mantém o valor atual. */
    public record AtualizarPerfil(
            @Size(min = 1, max = 200, message = "Nome deve ter de 1 a 200 caracteres")
            @Pattern(regexp = "(?s).*\\S.*", message = "Nome não pode ficar em branco")
            String nome,
            @Cpf String cpf,
            @Pattern(regexp = "[()\\s-]*(\\d[()\\s-]*){10,11}", message = "Celular inválido (DDD + número)")
            String celular,
            @Past(message = "Data de nascimento inválida") LocalDate dataNascimento) {
    }

    /** {@code null} = mantém; {@code ""} em {@code complemento} limpa. */
    public record AtualizarEndereco(
            @Pattern(regexp = "\\d{5}-?\\d{3}", message = "CEP inválido") String cep,
            @Size(min = 1, max = 200, message = "Rua deve ter de 1 a 200 caracteres") String rua,
            @Size(min = 1, max = 20, message = "Número deve ter de 1 a 20 caracteres") String numero,
            @Size(max = 100, message = "Complemento deve ter até 100 caracteres") String complemento,
            @Size(min = 1, max = 100, message = "Bairro deve ter de 1 a 100 caracteres") String bairro,
            @Size(min = 1, max = 100, message = "Cidade deve ter de 1 a 100 caracteres") String cidade,
            @Pattern(regexp = "(?i)AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO",
                    message = "UF inválida") String uf) {
    }

    private PerfilDtos() {
    }
}
