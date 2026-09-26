package br.ifce.uzusis.order;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.config.ScheduledTaskHolder;

import static org.assertj.core.api.Assertions.assertThat;

/** Sobe o contexto inteiro, com o yml real: pega Flyway duplicado, bean faltando e agendamento mudo. */
@SpringBootTest
@Import(PostgresDeTeste.class)
class OrderApplicationContextTest {

    @Autowired
    JdbcTemplate jdbc;

    // Só existe com @EnableScheduling.
    @Autowired
    ScheduledTaskHolder agendamentos;

    @Test
    void sobe_com_a_migracao_do_common_uma_vez_e_a_expiracao_agendada() {
        assertThat(jdbc.queryForObject("select count(*) from flyway_schema_history where version = '0'", Integer.class))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from information_schema.tables where table_name = 'outbox'",
                Integer.class)).isEqualTo(1);
        assertThat(agendamentos.getScheduledTasks()).isNotEmpty();
    }
}
