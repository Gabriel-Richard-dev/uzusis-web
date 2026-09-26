package br.ifce.uzusis.catalog;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/** O contexto inteiro sobe: Flyway, JPA validate, segurança, Kafka (parado) e MinIO. */
@SpringBootTest
@Import(PostgresDeTeste.class)
class CatalogApplicationContextTest {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void sobe_com_o_v0_do_common_aplicado_uma_vez_e_o_outbox_criado() {
        assertThat(jdbc.queryForObject(
                "select count(*) from flyway_schema_history where version = '0'", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select to_regclass('public.outbox') is not null", Boolean.class)).isTrue();
    }
}
