package br.ifce.uzusis.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Porta de entrada única. Na estratégia strangler fig, é a primeira peça a
 * subir: enquanto as rotas ainda apontam para o .NET, nada muda para o
 * frontend — e cada serviço extraído é uma rota que passa a apontar para o
 * Java, sem o front saber.
 */
@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
