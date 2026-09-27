package br.ifce.uzusis.identity.perfil;

import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarEndereco;
import br.ifce.uzusis.identity.perfil.PerfilDtos.AtualizarPerfil;
import br.ifce.uzusis.identity.perfil.PerfilService.Conta;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(PerfilService.class)
@Testcontainers
class PerfilServiceBancoTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    PerfilService service;
    @Autowired
    JdbcTemplate jdbc;

    private static final AtualizarEndereco SEM_ENDERECO = new AtualizarEndereco(null, null, null, null, null, null, null);

    @Test
    void put_antes_de_qualquer_get_cria_o_perfil_e_grava_so_os_digitos() {
        var perfil = service.atualizar(new Conta("sub-put", "Maria@Exemplo.com", "Maria Souza"),
                new AtualizarPerfil(null, "123.456.789-09", "(85) 99999-0000", LocalDate.of(1995, 4, 12)));

        assertThat(perfil.email()).isEqualTo("maria@exemplo.com");
        assertThat(perfil.nome()).isEqualTo("Maria Souza");
        assertThat(perfil.cpf()).isEqualTo("12345678909");
        assertThat(perfil.celular()).isEqualTo("85999990000");
        assertThat(perfil.dataNascimento()).isEqualTo(LocalDate.of(1995, 4, 12));
        assertThat(perfil.endereco()).isNotNull();
        assertThat(perfil.endereco().uf()).isNull();
    }

    @Test
    void null_mantem_o_valor_atual() {
        var conta = new Conta("sub-null", "ana@exemplo.com", "Ana");
        service.atualizar(conta, new AtualizarPerfil("Ana Lima", "12345678909", null, null));

        var perfil = service.atualizar(conta, new AtualizarPerfil(null, null, "8533334444", null));

        assertThat(perfil.nome()).isEqualTo("Ana Lima");
        assertThat(perfil.cpf()).isEqualTo("12345678909");
        assertThat(perfil.celular()).isEqualTo("8533334444");
    }

    @Test
    void get_atualiza_o_email_quando_o_token_traz_outro_e_mantem_quando_nao_traz() {
        service.obter(new Conta("sub-email", "antigo@exemplo.com", "Bia"));

        assertThat(service.obter(new Conta("sub-email", "Novo@Exemplo.com", "Bia")).email())
                .isEqualTo("novo@exemplo.com");
        assertThat(service.obter(new Conta("sub-email", null, "Bia")).email()).isEqualTo("novo@exemplo.com");
    }

    @Test
    void dois_perfis_podem_ter_o_mesmo_email() {
        service.obter(new Conta("sub-a", "mesmo@exemplo.com", "A"));
        service.obter(new Conta("sub-b", "mesmo@exemplo.com", "B"));

        assertThat(jdbc.queryForObject("select count(*) from perfil where email = 'mesmo@exemplo.com'", Integer.class))
                .isEqualTo(2);
    }

    @Test
    void endereco_faz_upsert_normaliza_uf_e_cep_e_complemento_vazio_limpa() {
        var conta = new Conta("sub-end", "c@exemplo.com", "Carla");

        var perfil = service.atualizarEndereco(conta,
                new AtualizarEndereco("60000000", "Rua A", "10", "Apto 101", "Centro", "Fortaleza", "ce"));
        assertThat(perfil.endereco()).isEqualTo(new PerfilDtos.EnderecoResposta(
                "60000-000", "Rua A", "10", "Apto 101", "Centro", "Fortaleza", "CE"));

        perfil = service.atualizarEndereco(conta, new AtualizarEndereco(null, null, null, "", null, null, null));
        assertThat(perfil.endereco().complemento()).isNull();
        assertThat(perfil.endereco().rua()).isEqualTo("Rua A");

        assertThat(service.atualizarEndereco(conta, SEM_ENDERECO).endereco().uf()).isEqualTo("CE");
        assertThat(jdbc.queryForObject("select estado from perfil where sub = 'sub-end'", String.class)).isEqualTo("CE");
    }

    @Test
    void nascimento_antes_de_1900_da_400() {
        assertThatThrownBy(() -> service.atualizar(new Conta("sub-1899", "d@exemplo.com", "D"),
                new AtualizarPerfil(null, null, null, LocalDate.of(1899, 12, 31))))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode().value()).isEqualTo(400);
                    assertThat(e.getReason()).isEqualTo("Data de nascimento inválida");
                });
    }

    @Test
    void perfil_de_outro_sub_inexistente_da_404() {
        assertThatThrownBy(() -> service.obterPorSub("nao-existe"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(404));
    }

    /** Sem a transação do teste: cada chamada commita na sua, como em produção. */
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void primeiro_get_concorrente_cria_um_perfil_so_e_nenhum_falha() throws Exception {
        var conta = new Conta("sub-corrida", "corrida@exemplo.com", "Corrida");
        var largada = new CountDownLatch(1);
        var futuros = new ArrayList<Future<PerfilDtos.PerfilResposta>>();
        try (var executor = Executors.newFixedThreadPool(8)) {
            for (var i = 0; i < 8; i++) {
                futuros.add(executor.submit(() -> {
                    largada.await();
                    return service.obter(conta);
                }));
            }
            largada.countDown();
            for (var futuro : futuros) {
                assertThat(futuro.get().sub()).isEqualTo("sub-corrida");
            }
        }

        assertThat(jdbc.queryForObject("select count(*) from perfil where sub = 'sub-corrida'", Integer.class))
                .isEqualTo(1);
    }
}
