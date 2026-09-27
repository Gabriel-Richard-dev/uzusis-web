package br.ifce.uzusis.payment.pagamento;

import br.ifce.uzusis.payment.config.ConfiguracaoStripe;
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
    private final ConfiguracaoStripe stripe;

    public PagamentoController(PagamentoService service, ConfiguracaoStripe stripe) {
        this.service = service;
        this.stripe = stripe;
    }

    /** Público: a publishable key chega ao front em runtime, nunca no build. */
    @GetMapping("/config")
    public ConfigResposta config() {
        return new ConfigResposta(stripe.habilitado(), stripe.habilitado() ? stripe.publishableKey() : null);
    }

    /**
     * O frontend pega o client_secret aqui e confirma o pagamento direto com a
     * Stripe (Stripe.js / SDK mobile).
     */
    @GetMapping("/{orderId}/client-secret")
    public PagamentoService.ClientSecretResposta clientSecret(@AuthenticationPrincipal Jwt jwt,
                                                              @PathVariable long orderId) {
        return service.clientSecret(orderId, jwt.getSubject());
    }

    public record ConfigResposta(boolean habilitado, String publishableKey) {
    }
}
