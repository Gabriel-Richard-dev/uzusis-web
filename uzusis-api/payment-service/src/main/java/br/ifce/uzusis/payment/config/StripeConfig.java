package br.ifce.uzusis.payment.config;

import com.stripe.StripeClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StripeConfig {

    private static final Logger log = LoggerFactory.getLogger(StripeConfig.class);

    /**
     * Com a chave vazia o cliente existe mas não é chamado: sem
     * {@link ConfiguracaoStripe#habilitado()} nenhum intent é criado, e o
     * resto só fala com a Stripe sobre um intent que já existe.
     * O api-base só muda no e2e, que aponta para o stripe-mock.
     */
    @Bean
    StripeClient stripeClient(ConfiguracaoStripe config) {
        if (!config.habilitado()) {
            log.warn("Stripe não configurado (STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY/STRIPE_WEBHOOK_SECRET): "
                    + "pagamentos desabilitados");
        }
        var builder = StripeClient.builder().setApiKey(config.secretKey());
        if (!config.apiBase().isBlank()) {
            builder.setApiBase(config.apiBase());
        }
        return builder.build();
    }
}
