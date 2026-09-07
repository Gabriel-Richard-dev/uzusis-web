package br.ifce.uzusis.order.catalogo;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Optional;

/**
 * Chamada serviço-a-serviço com token de client credentials. O Polly do .NET
 * vira Resilience4j: retry para a falha passageira e circuit breaker para não
 * ficar batendo num serviço que já caiu.
 */
@Component
public class CatalogoClient {

    private static final Logger log = LoggerFactory.getLogger(CatalogoClient.class);

    private final RestClient restClient;

    public CatalogoClient(RestClient catalogoRestClient) {
        this.restClient = catalogoRestClient;
    }

    @Retry(name = "catalogo")
    @CircuitBreaker(name = "catalogo", fallbackMethod = "indisponivel")
    public Optional<ProdutoResumo> obter(long produtoId) {
        try {
            return Optional.ofNullable(restClient.get()
                    .uri("/produtos/{id}", produtoId)
                    .retrieve()
                    .body(ProdutoResumo.class));
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                return Optional.empty();
            }
            throw e;
        }
    }

    /**
     * Circuito aberto: falha explícita em vez de carrinho montado com preço
     * inventado. Preço errado no carrinho é pior que erro na tela.
     */
    private Optional<ProdutoResumo> indisponivel(long produtoId, Throwable causa) {
        log.error("catalog-service indisponível ao buscar o produto {}: {}", produtoId, causa.getMessage());
        throw new CatalogoIndisponivelException(causa);
    }

    public static class CatalogoIndisponivelException extends RuntimeException {
        CatalogoIndisponivelException(Throwable causa) {
            super("Catálogo indisponível, tente de novo em instantes", causa);
        }
    }
}
