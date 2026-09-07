package br.ifce.uzusis.identity.perfil;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public final class PerfilDtos {

    public record EnderecoResposta(String cep, String rua, String numero, String bairro, String cidade, String estado) {

        static EnderecoResposta de(Endereco endereco) {
            return new EnderecoResposta(endereco.getCep(), endereco.getRua(), endereco.getNumero(),
                    endereco.getBairro(), endereco.getCidade(), endereco.getEstado());
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

    public record AtualizarPerfil(
            @Size(max = 200) String nome,
            @Pattern(regexp = "\\d{11}|\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}", message = "CPF inválido") String cpf,
            @Size(max = 20) String celular,
            @Past(message = "data de nascimento deve estar no passado") LocalDate dataNascimento) {
    }

    public record AtualizarEndereco(
            @Pattern(regexp = "\\d{5}-?\\d{3}", message = "CEP inválido") String cep,
            @Size(max = 200) String rua,
            @Size(max = 20) String numero,
            @Size(max = 100) String bairro,
            @Size(max = 100) String cidade,
            @Size(min = 2, max = 2, message = "estado deve ter 2 letras") String estado) {
    }

    private PerfilDtos() {
    }
}
