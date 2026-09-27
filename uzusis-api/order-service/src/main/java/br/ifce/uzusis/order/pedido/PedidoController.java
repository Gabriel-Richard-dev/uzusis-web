package br.ifce.uzusis.order.pedido;

import br.ifce.uzusis.order.pedido.PedidoDtos.CriarPedido;
import br.ifce.uzusis.order.pedido.PedidoDtos.FreteResposta;
import br.ifce.uzusis.order.pedido.PedidoDtos.PedidoResposta;
import br.ifce.uzusis.order.pedido.PedidoDtos.Resumo;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/pedidos")
public class PedidoController {

    private final PedidoService service;
    private final FreteService frete;

    public PedidoController(PedidoService service, FreteService frete) {
        this.service = service;
        this.frete = frete;
    }

    /**
     * Fecha a sacola. Devolve 201 com o pedido em CRIADO — pago ainda não
     * está: a confirmação vem do webhook da Stripe, nunca do frontend.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PedidoResposta criar(@AuthenticationPrincipal Jwt jwt, @RequestBody @Valid CriarPedido requisicao) {
        var email = email(jwt);
        return service.criar(jwt.getSubject(), email, nome(jwt, email), requisicao.endereco());
    }

    @GetMapping
    public List<PedidoResposta> meusPedidos(@AuthenticationPrincipal Jwt jwt) {
        return service.meusPedidos(jwt.getSubject());
    }

    @GetMapping("/frete")
    public FreteResposta frete(@RequestParam String uf) {
        return new FreteResposta(uf.toUpperCase(), frete.valor(uf));
    }

    @GetMapping("/{id}")
    public PedidoResposta obter(@PathVariable long id, Authentication autenticacao) {
        boolean admin = autenticacao.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return service.obter(id, autenticacao.getName(), admin);
    }

    @PostMapping("/{id}/receber")
    public PedidoResposta receber(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return service.receber(id, jwt.getSubject());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<PedidoResposta> listarParaAdmin(
            @RequestParam(defaultValue = "PAGO") List<StatusPedido> status,
            @PageableDefault(size = 20, sort = "pagoEm", direction = Sort.Direction.ASC) Pageable pagina) {
        return service.listarParaAdmin(status, pagina);
    }

    @PostMapping("/{id}/enviar")
    @PreAuthorize("hasRole('ADMIN')")
    public PedidoResposta enviar(@PathVariable long id) {
        return service.enviar(id);
    }

    @GetMapping("/admin/resumo")
    @PreAuthorize("hasRole('ADMIN')")
    public Resumo resumo() {
        return service.resumo();
    }

    /**
     * O e-mail vem do token do Keycloak. Sem ele o cliente não recebe
     * confirmação nenhuma, e descobrir isso depois da compra é pior.
     */
    private static String email(Jwt jwt) {
        var email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Sua conta está sem e-mail; entre novamente");
        }
        return email;
    }

    /** O nome da conta (Keycloak) no momento da compra; cabe na coluna de 200. */
    private static String nome(Jwt jwt, String email) {
        for (var claim : List.of("name", "preferred_username")) {
            var valor = jwt.getClaimAsString(claim);
            if (valor != null && !valor.isBlank()) {
                return valor.length() > 200 ? valor.substring(0, 200) : valor;
            }
        }
        return email;
    }
}
