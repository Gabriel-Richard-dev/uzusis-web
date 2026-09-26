package br.ifce.uzusis.gateway;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * O gateway valida o token na borda e repassa. Os serviços validam de novo —
 * confiar só na borda significa que qualquer coisa que entre na rede interna
 * é admin. Sem CORS: o nginx serve front, API e Keycloak na mesma origem.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    SecurityWebFilterChain filterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(rotas -> rotas
                        // Vitrine aberta. /produtos/admin/** é protegido no catalog.
                        .pathMatchers(HttpMethod.GET, "/api/produtos/**").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/pagamentos/config").permitAll()
                        // A Stripe não manda JWT: quem autentica é a assinatura,
                        // conferida dentro do payment-service.
                        .pathMatchers(HttpMethod.POST, "/api/webhooks/stripe").permitAll()
                        .pathMatchers("/actuator/health/**").permitAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> {
                }))
                .build();
    }

    /**
     * ID token não vale como Bearer: mesmo iss, chave e sub do access token, só
     * o typ muda ("ID"). O Boot soma este validador ao de iss/exp do decoder
     * (issuer-uri + jwk-set-uri, sem discovery). Igual ao SoAccessToken do common.
     */
    @Bean
    OAuth2TokenValidator<Jwt> typBearer() {
        return new JwtClaimValidator<String>("typ", "Bearer"::equals);
    }
}
