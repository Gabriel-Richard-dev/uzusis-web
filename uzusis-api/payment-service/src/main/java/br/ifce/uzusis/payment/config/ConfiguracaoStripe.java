package br.ifce.uzusis.payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * As chaves vêm do ambiente e podem faltar: o usuário põe depois. Sem as três,
 * a loja sobe com o pagamento desligado em vez de cair no boot.
 */
@Component
public record ConfiguracaoStripe(
        @Value("${uzusis.stripe.secret-key:}") String secretKey,
        @Value("${uzusis.stripe.publishable-key:}") String publishableKey,
        @Value("${uzusis.stripe.webhook-secret:}") String webhookSecret,
        @Value("${uzusis.stripe.api-base:}") String apiBase,
        @Value("${uzusis.stripe.moeda:brl}") String moeda) {

    public boolean habilitado() {
        return !secretKey.isBlank() && !publishableKey.isBlank() && !webhookSecret.isBlank();
    }

    /** O record imprimiria as chaves; ninguém loga isto, mas não custa esconder. */
    @Override
    public String toString() {
        return "ConfiguracaoStripe[habilitado=" + habilitado() + ", apiBase=" + apiBase + ", moeda=" + moeda + "]";
    }
}
