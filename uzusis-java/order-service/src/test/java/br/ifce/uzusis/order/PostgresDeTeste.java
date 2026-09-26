package br.ifce.uzusis.order;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;

/** Um Postgres para a suíte inteira: os contextos de teste reaproveitam o mesmo contêiner. */
@TestConfiguration(proxyBeanMethods = false)
public class PostgresDeTeste {

    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgres() {
        return POSTGRES;
    }
}
