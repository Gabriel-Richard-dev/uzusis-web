package br.ifce.uzusis.identity.perfil;

import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarEndereco;
import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarPerfil;
import br.ifce.uzusis.identity.perfil.PerfilDtos.PerfilResposta;
import br.ifce.uzusis.identity.perfil.PerfilService.Conta;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** O dono é sempre o {@code sub} do token; nenhum endpoint recebe id de usuário para agir sobre "si". */
@RestController
@RequestMapping("/perfil")
public class PerfilController {

    private final PerfilService service;

    public PerfilController(PerfilService service) {
        this.service = service;
    }

    @GetMapping
    public PerfilResposta meuPerfil(@AuthenticationPrincipal Jwt jwt) {
        return service.obter(conta(jwt));
    }

    @PutMapping
    public PerfilResposta atualizar(@AuthenticationPrincipal Jwt jwt, @RequestBody @Valid AtualizarPerfil requisicao) {
        return service.atualizar(conta(jwt), requisicao);
    }

    @PutMapping("/endereco")
    public PerfilResposta atualizarEndereco(@AuthenticationPrincipal Jwt jwt,
                                            @RequestBody @Valid AtualizarEndereco requisicao) {
        return service.atualizarEndereco(conta(jwt), requisicao);
    }

    @GetMapping("/{sub}")
    @PreAuthorize("hasRole('ADMIN')")
    public PerfilResposta porSub(@PathVariable String sub) {
        return service.obterPorSub(sub);
    }

    private static Conta conta(Jwt jwt) {
        var nome = jwt.getClaimAsString("name");
        if (nome == null) {
            nome = jwt.getClaimAsString("preferred_username");
        }
        return new Conta(jwt.getSubject(), jwt.getClaimAsString("email"), nome != null ? nome : "Cliente");
    }
}
