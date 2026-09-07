package br.ifce.uzusis.identity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Casca fina sobre o Keycloak. NÃO guarda senha: guarda o perfil do cliente e
 * o vínculo com o "sub" do token. Autenticação, hash e reset de senha são
 * problema do Keycloak, e é isso que apaga do sistema todo o código de
 * Argon2, confirmação de e-mail e recuperação de senha que existia no .NET.
 */
@SpringBootApplication(scanBasePackages = "br.ifce.uzusis")
@EntityScan("br.ifce.uzusis")
@EnableJpaRepositories("br.ifce.uzusis")
public class IdentityApplication {

    public static void main(String[] args) {
        SpringApplication.run(IdentityApplication.class, args);
    }
}
