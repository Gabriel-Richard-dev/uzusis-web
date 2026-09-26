package br.ifce.uzusis.identity;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Contexto inteiro (yml, Flyway, segurança e o TratadorDeErros do common) contra Postgres de verdade. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class IdentityApplicationContextTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    MockMvc mvc;

    private static JwtRequestPostProcessor cliente(String sub) {
        return jwt().jwt(j -> j.subject(sub).claim("email", "Maria@Exemplo.com").claim("name", "Maria Souza"))
                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"));
    }

    @Test
    void flyway_aplica_o_v0_do_common_uma_vez_so_e_cria_o_outbox() {
        assertThat(jdbc.queryForObject("select count(*) from flyway_schema_history where version = '0'",
                Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select to_regclass('public.outbox') is not null", Boolean.class)).isTrue();
    }

    @Test
    void put_antes_de_qualquer_get_da_200() throws Exception {
        mvc.perform(put("/perfil").with(cliente("sub-put")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"123.456.789-09\",\"celular\":\"(85) 99999-0000\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("maria@exemplo.com"))
                .andExpect(jsonPath("$.nome").value("Maria Souza"))
                .andExpect(jsonPath("$.cpf").value("12345678909"))
                .andExpect(jsonPath("$.celular").value("85999990000"))
                .andExpect(jsonPath("$.endereco.uf").isEmpty());
    }

    @Test
    void validacoes_dao_400_com_detail_em_pt_br() throws Exception {
        mvc.perform(put("/perfil").with(cliente("sub-cpf")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"111.111.111-11\",\"celular\":\"123\",\"dataNascimento\":\"2999-01-01\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(allOf(
                        startsWith("Dados inválidos: "),
                        containsString("cpf: CPF inválido"),
                        containsString("celular: Celular inválido (DDD + número)"),
                        containsString("dataNascimento: Data de nascimento inválida"))))
                .andExpect(jsonPath("$.erros.length()").value(3));

        mvc.perform(put("/perfil/endereco").with(cliente("sub-uf")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"uf\":\"XX\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Dados inválidos: uf: UF inválida"));
    }

    @Test
    void uf_em_minuscula_e_gravada_em_maiuscula() throws Exception {
        mvc.perform(put("/perfil/endereco").with(cliente("sub-ce")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cep\":\"60000000\",\"uf\":\"ce\",\"complemento\":\"Apto 1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endereco.uf").value("CE"))
                .andExpect(jsonPath("$.endereco.cep").value("60000-000"))
                .andExpect(jsonPath("$.endereco.complemento").value("Apto 1"));
    }

    @Test
    void perfil_por_sub_so_para_admin_e_negacao_nao_vira_500() throws Exception {
        mvc.perform(get("/perfil/sub-put")).andExpect(status().isUnauthorized());
        mvc.perform(get("/perfil")).andExpect(status().isUnauthorized());
        mvc.perform(get("/perfil/sub-put").with(cliente("outro"))).andExpect(status().isForbidden());

        var admin = jwt().jwt(j -> j.subject("admin")).authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
        mvc.perform(get("/perfil").with(cliente("sub-admin-ve")))
                .andExpect(status().isOk());
        mvc.perform(get("/perfil/sub-admin-ve").with(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sub").value("sub-admin-ve"));
        mvc.perform(get("/perfil/nao-existe").with(admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Perfil não encontrado"));
    }
}
