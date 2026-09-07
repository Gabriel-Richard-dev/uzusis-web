package br.ifce.uzusis.payment.config;

import com.stripe.StripeClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StripeConfig {

    /**
     * A chave vem do ambiente, nunca do repositório. Em produção é secret do
     * Kubernetes ou vault; aqui é variável de ambiente do compose.
     */
    @Bean
    StripeClient stripeClient(@Value("${uzusis.stripe.secret-key}") String secretKey) {
        return new StripeClient(secretKey);
    }
}
