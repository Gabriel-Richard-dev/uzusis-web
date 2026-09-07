package br.ifce.uzusis.gateway;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * O gateway valida o token na borda e repassa. Os serviços validam de novo —
 * confiar só na borda significa que qualquer coisa que entre na rede interna
 * é admin.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    SecurityWebFilterChain filterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(rotas -> rotas
                        // Vitrine aberta, igual ao comportamento atual da loja.
                        .pathMatchers(HttpMethod.GET, "/api/produtos/**").permitAll()
                        // A Stripe não manda JWT: quem autentica é a assinatura,
                        // conferida dentro do payment-service.
                        .pathMatchers("/api/webhooks/stripe").permitAll()
                        .pathMatchers("/actuator/health/**").permitAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> {
                }))
                .build();
    }
}
