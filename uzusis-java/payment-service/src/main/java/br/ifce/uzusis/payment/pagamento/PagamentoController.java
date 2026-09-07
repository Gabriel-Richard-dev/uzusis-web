package br.ifce.uzusis.payment.pagamento;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/pagamentos")
public class PagamentoController {

    private final PagamentoService service;

    public PagamentoController(PagamentoService service) {
        this.service = service;
    }

    /**
     * O frontend pega o client_secret aqui e confirma o pagamento direto com a
     * Stripe (Stripe.js / SDK mobile).
     */
    @GetMapping("/{orderId}/client-secret")
    public ClientSecretResposta clientSecret(@AuthenticationPrincipal Jwt jwt, @PathVariable long orderId) {
        return new ClientSecretResposta(service.clientSecret(orderId, jwt.getSubject()));
    }

    public record ClientSecretResposta(String clientSecret) {
    }
}
