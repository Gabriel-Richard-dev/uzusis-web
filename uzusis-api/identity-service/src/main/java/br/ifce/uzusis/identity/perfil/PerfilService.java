package br.ifce.uzusis.identity.perfil;

import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarEndereco;
import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarPerfil;
import br.ifce.uzusis.identity.perfil.PerfilDtos.PerfilResposta;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class PerfilService {

    private static final LocalDate NASCIMENTO_MINIMO = LocalDate.of(1900, 1, 1);

    private final PerfilRepository repository;

    public PerfilService(PerfilRepository repository) {
        this.repository = repository;
    }

    /** O que o token diz de quem chama. {@code email} pode faltar. */
    public record Conta(String sub, String email, String nome) {
    }

    @Transactional
    public PerfilResposta obter(Conta conta) {
        return PerfilResposta.de(garantir(conta));
    }

    @Transactional
    public PerfilResposta atualizar(Conta conta, AtualizarPerfil requisicao) {
        if (requisicao.dataNascimento() != null && requisicao.dataNascimento().isBefore(NASCIMENTO_MINIMO)) {
            throw new ResponseStatusException(BAD_REQUEST, "Data de nascimento inválida");
        }
        var perfil = garantir(conta);
        perfil.atualizar(requisicao);
        return PerfilResposta.de(perfil);
    }

    @Transactional
    public PerfilResposta atualizarEndereco(Conta conta, AtualizarEndereco requisicao) {
        var perfil = garantir(conta);
        perfil.atualizarEndereco(requisicao);
        return PerfilResposta.de(perfil);
    }

    @Transactional(readOnly = true)
    public PerfilResposta obterPorSub(String sub) {
        return repository.findBySub(sub)
                .map(PerfilResposta::de)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Perfil não encontrado"));
    }

    /**
     * Cria o perfil no primeiro acesso, a partir das claims do token. Não
     * existe endpoint de cadastro: quem cria o usuário é o Keycloak, e o
     * perfil aparece quando o usuário aparece.
     */
    private Perfil garantir(Conta conta) {
        var email = conta.email() != null ? conta.email() : conta.sub() + "@sem-email.local";
        repository.criarSeNaoExistir(conta.sub(), email, conta.nome());
        var perfil = repository.findBySub(conta.sub()).orElseThrow();
        if (conta.email() != null) {
            perfil.atualizarEmail(conta.email());
        }
        return perfil;
    }
}
