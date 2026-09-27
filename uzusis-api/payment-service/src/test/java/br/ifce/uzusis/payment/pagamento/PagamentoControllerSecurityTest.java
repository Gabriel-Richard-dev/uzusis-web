package br.ifce.uzusis.payment.pagamento;

import br.ifce.uzusis.payment.PostgresDeTeste;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Contexto sem chaves da Stripe: o pagamento está desligado. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(PostgresDeTeste.class)
class PagamentoControllerSecurityTest {

    @Autowired
    MockMvc http;

    @Autowired
    PagamentoRepository pagamentos;

    @Test
    void configEPublicaEDizQueEstaDesligado() throws Exception {
        http.perform(get("/pagamentos/config"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"habilitado\":false,\"publishableKey\":null}", true));
    }

    @Test
    void clientSecretExigeToken() throws Exception {
        http.perform(get("/pagamentos/1/client-secret")).andExpect(status().isUnauthorized());
    }

    @Test
    void pagamentoDeOutroClienteE404ComoInexistente() throws Exception {
        pagamentos.save(new Pagamento(9001, "dono", BigDecimal.TEN));

        http.perform(get("/pagamentos/9001/client-secret").with(jwt().jwt(j -> j.subject("intruso"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Pagamento não encontrado"));
        http.perform(get("/pagamentos/9002/client-secret").with(jwt().jwt(j -> j.subject("intruso"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Pagamento não encontrado"));
    }

    @Test
    void semChavesODonoRecebe503() throws Exception {
        pagamentos.save(new Pagamento(9003, "dono", BigDecimal.TEN));

        http.perform(get("/pagamentos/9003/client-secret").with(jwt().jwt(j -> j.subject("dono"))))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.detail").value("Pagamento ainda não configurado"));
    }
}
