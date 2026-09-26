package br.ifce.uzusis.notification;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Contexto inteiro com Postgres de verdade; sem Kafka (listeners parados) e sem SMTP (health de mail desligado). */
@SpringBootTest(properties = {
        "spring.kafka.listener.auto-startup=false",
        "management.health.mail.enabled=false"})
@AutoConfigureMockMvc
@Testcontainers
class NotificationApplicationContextTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    MockMvc mvc;

    @Test
    void sobe_e_so_libera_o_health() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/actuator/info")).andExpect(status().isForbidden());
        mvc.perform(get("/qualquer-coisa")).andExpect(status().isForbidden());
    }
}
