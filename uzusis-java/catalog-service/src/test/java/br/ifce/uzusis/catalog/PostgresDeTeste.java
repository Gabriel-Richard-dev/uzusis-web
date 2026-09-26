package br.ifce.uzusis.catalog;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Postgres de verdade como bean: vive e morre com o contexto, e as classes
 * que importam a mesma configuração dividem contexto e contêiner.
 */
@TestConfiguration(proxyBeanMethods = false)
public class PostgresDeTeste {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgres() {
        return new PostgreSQLContainer<>("postgres:16-alpine");
    }
}
