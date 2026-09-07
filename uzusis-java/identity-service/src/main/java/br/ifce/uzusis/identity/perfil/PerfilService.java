package br.ifce.uzusis.identity.perfil;

import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarEndereco;
import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarPerfil;
import br.ifce.uzusis.identity.perfil.PerfilDtos.PerfilResposta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class PerfilService {

    private static final Logger log = LoggerFactory.getLogger(PerfilService.class);

    private final PerfilRepository repository;

    public PerfilService(PerfilRepository repository) {
        this.repository = repository;
    }

    /**
     * Cria o perfil na primeira visita, a partir das claims do token. Não
     * existe endpoint de cadastro: quem cria o usuário é o Keycloak, e o
     * perfil aparece quando o usuário aparece. Um cadastro em duas etapas
     * (Keycloak e depois aqui) daria usuário sem perfil na metade das vezes.
     */
    @Transactional
    public PerfilResposta obterOuCriar(String sub, String email, String nome) {
        var perfil = repository.findBySub(sub).orElseGet(() -> {
            log.info("Criando perfil para o sub {}", sub);
            return repository.save(new Perfil(sub, email, nome));
        });
        return PerfilResposta.de(perfil);
    }

    @Transactional
    public PerfilResposta atualizar(String sub, AtualizarPerfil requisicao) {
        var perfil = exigir(sub);
        perfil.atualizar(requisicao.nome(), requisicao.cpf(), requisicao.celular(), requisicao.dataNascimento());
        return PerfilResposta.de(perfil);
    }

    @Transactional
    public PerfilResposta atualizarEndereco(String sub, AtualizarEndereco requisicao) {
        var perfil = exigir(sub);
        perfil.atualizarEndereco(requisicao.cep(), requisicao.rua(), requisicao.numero(),
                requisicao.bairro(), requisicao.cidade(), requisicao.estado());
        return PerfilResposta.de(perfil);
    }

    @Transactional(readOnly = true)
    public PerfilResposta obterPorSub(String sub) {
        return PerfilResposta.de(exigir(sub));
    }

    private Perfil exigir(String sub) {
        return repository.findBySub(sub)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Perfil não encontrado"));
    }
}
