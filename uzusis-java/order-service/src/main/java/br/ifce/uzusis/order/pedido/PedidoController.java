package br.ifce.uzusis.order.pedido;

import br.ifce.uzusis.order.pedido.PedidoDtos.ItemResposta;
import br.ifce.uzusis.order.pedido.PedidoDtos.PedidoResposta;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    public PedidoController(PedidoService service) {
        this.service = service;
    }

    /**
     * Fecha o carrinho. Devolve 201 com o pedido em CRIADO — pago ainda não
     * está: a confirmação vem do webhook da Stripe, nunca do frontend.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PedidoResposta finalizar(@AuthenticationPrincipal Jwt jwt) {
        return service.finalizarCompra(jwt.getSubject(), email(jwt));
    }

    @GetMapping
    public List<PedidoResposta> meusPedidos(@AuthenticationPrincipal Jwt jwt) {
        return service.meusPedidos(jwt.getSubject());
    }

    @GetMapping("/historico")
    public List<ItemResposta> historico(@AuthenticationPrincipal Jwt jwt) {
        return service.historico(jwt.getSubject());
    }

    @GetMapping("/andamento")
    public List<ItemResposta> emAndamento(@AuthenticationPrincipal Jwt jwt) {
        return service.emAndamento(jwt.getSubject());
    }

    @GetMapping("/itens")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ItemResposta> itensPorEnvio(@RequestParam(defaultValue = "false") boolean enviados) {
        return service.itensPorEnvio(enviados);
    }

    @PostMapping("/itens/{itemId}/enviar")
    @PreAuthorize("hasRole('ADMIN')")
    public ItemResposta enviar(@PathVariable long itemId) {
        return service.enviarItem(itemId);
    }

    @PostMapping("/itens/{itemId}/receber")
    public ItemResposta receber(@AuthenticationPrincipal Jwt jwt, @PathVariable long itemId) {
        return service.receberItem(jwt.getSubject(), itemId);
    }

    /**
     * O e-mail vem do token do Keycloak. Se o realm não estiver mandando a
     * claim, o pedido para aqui: sem e-mail o cliente não recebe confirmação
     * nenhuma, e descobrir isso depois da compra é pior.
     */
    private static String email(Jwt jwt) {
        var email = jwt.getClaimAsString("email");
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Token sem a claim email; confira o mapper do client no Keycloak");
        }
        return email;
    }
}
