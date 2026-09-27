package br.ifce.uzusis.payment;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/** Sobe o contexto inteiro, sem chaves da Stripe: o boot não pode depender delas. */
// As mesmas anotações nos três testes com Spring: um contexto e um Postgres só.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(PostgresDeTeste.class)
class PaymentApplicationContextTest {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void sobeComFlywayDeLocationUnica() {
        // Com duas locations o V0 do common seria achado duas vezes e o boot cairia.
        assertThat(jdbc.queryForObject(
                "select count(*) from flyway_schema_history where version = '0'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_name = 'outbox'", Integer.class))
                .isEqualTo(1);
    }
}
