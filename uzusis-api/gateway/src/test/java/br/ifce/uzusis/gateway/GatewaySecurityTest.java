package br.ifce.uzusis.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.netty.http.client.HttpClient;

/**
 * Sem backend nem Keycloak: as rotas públicas passam pela segurança e morrem no
 * roteamento (5xx); as demais param no 401 antes de rotear.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        // porta 10: conexão recusada (o Reactor Netty exige porta com 2+ dígitos)
        "CATALOG_URL=http://127.0.0.1:10",
        "ORDER_URL=http://127.0.0.1:10",
        "PAYMENT_URL=http://127.0.0.1:10",
        "IDENTITY_URL=http://127.0.0.1:10"})
class GatewaySecurityTest {

    @Autowired
    WebTestClient http;
    @Autowired
    ReactiveJwtDecoder decodificador;
    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    String emissor;

    @Test
    void rotasProtegidasExigemToken() {
        assertThat(status(HttpMethod.GET, "/api/pedidos")).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(status(HttpMethod.POST, "/api/produtos")).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(status(HttpMethod.GET, "/api/pagamentos/1/client-secret")).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(status(HttpMethod.GET, "/api/perfil")).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rotasPublicasPassamPelaSeguranca() {
        // 5xx = passou pela segurança e foi roteado para o backend (que não existe aqui)
        assertThat(status(HttpMethod.GET, "/api/produtos")).matches(HttpStatus::is5xxServerError, "5xx");
        assertThat(status(HttpMethod.GET, "/api/produtos/42")).matches(HttpStatus::is5xxServerError, "5xx");
        assertThat(status(HttpMethod.GET, "/api/pagamentos/config")).matches(HttpStatus::is5xxServerError, "5xx");
        assertThat(status(HttpMethod.POST, "/api/webhooks/stripe")).matches(HttpStatus::is5xxServerError, "5xx");
    }

    @Test
    void ipDosServicosNaoFicaPresoNoCacheDeDns(@Autowired HttpClient cliente) {
        // sem limite, vale o TTL do DNS do Docker (600 s) e um serviço recriado com outro IP dá 500
        assertThat(cliente.configuration().getNameResolverProvider()).isNotNull();
        assertThat(cliente.configuration().getNameResolverProvider().cacheMaxTimeToLive()).isLessThanOrEqualTo(Duration.ofSeconds(5));
    }

    @Test
    void caminhoSemRotaNuncaERoteado() {
        assertThat(status(HttpMethod.GET, "/api/qualquer-coisa")).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.NOT_FOUND);
        assertThat(status(HttpMethod.GET, "/api/administradorauth/adicionar")).isIn(HttpStatus.UNAUTHORIZED, HttpStatus.NOT_FOUND);
    }

    /**
     * O validador de verdade do decoder que o Boot montou: sem o Keycloak não
     * há como assinar um token, então a assinatura fica de fora.
     */
    @Test
    @SuppressWarnings("unchecked")
    void idTokenDoKeycloakNaoValeComoAccessToken() {
        var validador = (OAuth2TokenValidator<Jwt>) ReflectionTestUtils.getField(decodificador, "jwtValidator");

        assertThat(validador.validate(token("ID")).hasErrors()).isTrue();
        assertThat(validador.validate(token("Bearer")).hasErrors()).isFalse();
    }

    private Jwt token(String typ) {
        return Jwt.withTokenValue("t").header("alg", "RS256").issuer(emissor).subject("sub-1").claim("typ", typ)
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
    }

    private HttpStatus status(HttpMethod metodo, String caminho) {
        return HttpStatus.valueOf(http.method(metodo).uri(caminho).exchange()
                .returnResult(Void.class).getStatus().value());
    }
}
