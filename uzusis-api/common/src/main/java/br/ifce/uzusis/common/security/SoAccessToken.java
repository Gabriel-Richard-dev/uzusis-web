package br.ifce.uzusis.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;

/**
 * O ID token do Keycloak tem o mesmo iss, a mesma chave e o mesmo sub do
 * access token; só o typ muda ("ID"). E ele vaza: vai no id_token_hint da URL
 * de logout (histórico do navegador, log do nginx). Sem esta checagem, ele vale
 * como Bearer na API.
 *
 * <p>O Boot soma todo bean {@code OAuth2TokenValidator<Jwt>} ao validador de
 * iss/exp do JwtDecoder que ele monta com issuer-uri + jwk-set-uri, então a
 * busca das chaves continua pela rede interna, sem discovery na URL pública.
 * O gateway, que não depende do common, declara o mesmo bean.
 */
@Configuration
public class SoAccessToken {

    @Bean
    OAuth2TokenValidator<Jwt> typBearer() {
        return new JwtClaimValidator<String>("typ", "Bearer"::equals);
    }
}
