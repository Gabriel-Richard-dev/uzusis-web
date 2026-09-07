package br.ifce.uzusis.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.AuthorizedClientServiceOAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientProviderBuilder;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    /**
     * Client confidencial do Keycloak, fluxo Client Credentials. É o token do
     * SERVIÇO, não do usuário: repassar o token do cliente para dentro daria a
     * ele as permissões que o serviço tem.
     */
    @Bean
    OAuth2AuthorizedClientManager authorizedClientManager(
            ClientRegistrationRepository registros,
            OAuth2AuthorizedClientService servico) {
        var manager = new AuthorizedClientServiceOAuth2AuthorizedClientManager(registros, servico);
        manager.setAuthorizedClientProvider(
                OAuth2AuthorizedClientProviderBuilder.builder().clientCredentials().build());
        return manager;
    }

    @Bean
    RestClient catalogoRestClient(
            RestClient.Builder builder,
            OAuth2AuthorizedClientManager manager,
            @Value("${uzusis.catalogo.base-url}") String baseUrl) {
        return builder
                .baseUrl(baseUrl)
                .requestInterceptor((requisicao, corpo, execucao) -> {
                    var autorizado = manager.authorize(OAuth2AuthorizeRequest
                            .withClientRegistrationId("order-service")
                            .principal("order-service")
                            .build());
                    if (autorizado != null) {
                        requisicao.getHeaders().setBearerAuth(autorizado.getAccessToken().getTokenValue());
                    }
                    return execucao.execute(requisicao, corpo);
                })
                .build();
    }
}
