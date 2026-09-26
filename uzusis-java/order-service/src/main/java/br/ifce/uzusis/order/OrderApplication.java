package br.ifce.uzusis.order;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;

/** {@code @EnableScheduling}: sem ele a expiração de pedidos nunca roda, e sem erro. */
@SpringBootApplication(scanBasePackages = "br.ifce.uzusis")
@EntityScan("br.ifce.uzusis")
@EnableJpaRepositories("br.ifce.uzusis")
@EnableScheduling
public class OrderApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }

    @Bean
    Clock relogio() {
        return Clock.systemUTC();
    }
}
