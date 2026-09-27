package br.ifce.uzusis.gateway;

import java.time.Duration;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.config.HttpClientCustomizer;
import org.springframework.context.annotation.Bean;

/**
 * Porta de entrada da API: o nginx repassa /api/** para cá e o gateway
 * valida o token e roteia para o serviço dono do caminho.
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }

    /**
     * O DNS do Docker responde com TTL de 600 s, e o resolvedor do Reactor Netty guarda o IP por esse tempo:
     * um serviço recriado com outro IP (um {@code docker compose up -d} depois de mudar o .env) daria 500 por
     * até 10 min, com o gateway batendo no IP antigo.
     */
    @Bean
    HttpClientCustomizer dnsSemCacheLongo() {
        return http -> http.resolver(dns -> dns.cacheMaxTimeToLive(Duration.ofSeconds(5)));
    }
}
