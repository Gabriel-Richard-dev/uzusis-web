package br.ifce.uzusis.notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Serviço puramente reativo: não tem API, só consome evento e manda e-mail.
 * Foi o primeiro candidato à extração justamente por isso — se cair, ninguém
 * deixa de comprar.
 */
@SpringBootApplication(scanBasePackages = "br.ifce.uzusis")
@EntityScan("br.ifce.uzusis")
@EnableJpaRepositories("br.ifce.uzusis")
public class NotificationApplication {

    public static void main(String[] args) {
        SpringApplication.run(NotificationApplication.class, args);
    }
}
