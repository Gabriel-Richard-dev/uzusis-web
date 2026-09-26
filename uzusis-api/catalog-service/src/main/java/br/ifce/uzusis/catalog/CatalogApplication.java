package br.ifce.uzusis.catalog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * O outbox e a tabela de idempotência moram no módulo common, fora do pacote
 * deste serviço — por isso os três escopos apontam para a raiz br.ifce.uzusis.
 */
@SpringBootApplication(scanBasePackages = "br.ifce.uzusis")
@EntityScan("br.ifce.uzusis")
@EnableJpaRepositories("br.ifce.uzusis")
public class CatalogApplication {

    public static void main(String[] args) {
        SpringApplication.run(CatalogApplication.class, args);
    }
}
