package br.ifce.uzusis.identity.perfil;

import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarEndereco;
import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarPerfil;
import br.ifce.uzusis.identity.perfil.PerfilDtos.PerfilResposta;
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

@RestController
@RequestMapping("/perfil")
public class PerfilController {

    private final PerfilService service;

    public PerfilController(PerfilService service) {
        this.service = service;
    }

    @GetMapping
    public PerfilResposta meuPerfil(@AuthenticationPrincipal Jwt jwt) {
        return service.obterOuCriar(jwt.getSubject(), email(jwt), nome(jwt));
    }

    @PutMapping
    public PerfilResposta atualizar(@AuthenticationPrincipal Jwt jwt, @RequestBody @Valid AtualizarPerfil requisicao) {
        return service.atualizar(jwt.getSubject(), requisicao);
    }

    @PutMapping("/endereco")
    public PerfilResposta atualizarEndereco(@AuthenticationPrincipal Jwt jwt,
                                            @RequestBody @Valid AtualizarEndereco requisicao) {
        return service.atualizarEndereco(jwt.getSubject(), requisicao);
    }

    @GetMapping("/{sub}")
    @PreAuthorize("hasRole('ADMIN')")
    public PerfilResposta porSub(@PathVariable String sub) {
        return service.obterPorSub(sub);
    }

    private static String email(Jwt jwt) {
        var email = jwt.getClaimAsString("email");
        return email != null ? email : jwt.getSubject() + "@sem-email.local";
    }

    private static String nome(Jwt jwt) {
        var nome = jwt.getClaimAsString("name");
        if (nome == null) {
            nome = jwt.getClaimAsString("preferred_username");
        }
        return nome != null ? nome : "Cliente";
    }
}
