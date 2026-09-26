package br.ifce.uzusis.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class RestClientConfig {

    /**
     * Sem token: o GET /produtos/{id} do catálogo é público. Timeouts curtos
     * porque a chamada acontece com o cliente esperando a resposta da sacola.
     */
    @Bean
    RestClient catalogoRestClient(RestClient.Builder builder, @Value("${uzusis.catalogo.base-url}") String baseUrl) {
        var fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(Duration.ofSeconds(2));
        fabrica.setReadTimeout(Duration.ofSeconds(5));
        return builder.baseUrl(baseUrl).requestFactory(fabrica).build();
    }
}
