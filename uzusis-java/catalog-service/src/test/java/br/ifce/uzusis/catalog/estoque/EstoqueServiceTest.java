package br.ifce.uzusis.catalog.estoque;

import br.ifce.uzusis.catalog.produto.CategoriaProduto;
import br.ifce.uzusis.catalog.produto.Produto;
import br.ifce.uzusis.catalog.produto.ProdutoRepository;
import br.ifce.uzusis.catalog.produto.TamanhoRepository;
import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.outbox.OutboxPublisher;
import br.ifce.uzusis.common.outbox.OutboxRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Reserva de estoque contra Postgres de verdade, via Testcontainers.
 *
 * <p>Não dá para testar isso com banco em memória: o que está sendo verificado
 * é o comportamento de {@code SELECT ... FOR UPDATE}, do CHECK de quantidade
 * não negativa e do JSONB do outbox — três coisas que um H2 finge que suporta.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({EstoqueService.class, OutboxPublisher.class, EstoqueServiceTest.JacksonDeTeste.class})
@Testcontainers
class EstoqueServiceTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @TestConfiguration
    static class JacksonDeTeste {
        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper().registerModule(new JavaTimeModule());
        }
    }

    @Autowired
    EstoqueService estoque;
    @Autowired
    ProdutoRepository produtos;
    @Autowired
    TamanhoRepository tamanhos;
    @Autowired
    OutboxRepository outbox;
    @Autowired
    ReservaEstoqueRepository reservas;

    private Produto camisetaComEstoque(int quantidade) {
        var produto = new Produto("Camiseta", new BigDecimal("50.00"), "Camiseta de teste", CategoriaProduto.BLUSA);
        produto.adicionarTamanho("M", quantidade);
        return produtos.saveAndFlush(produto);
    }

    @Test
    void reserva_baixa_o_estoque_e_publica_o_evento_de_reserva() {
        var produto = camisetaComEstoque(10);
        var tamanhoId = produto.getTamanhos().get(0).getId();

        estoque.reservar(1L, List.of(new Events.Item(produto.getId(), tamanhoId, "M", 3, 5000L)));

        assertThat(tamanhos.findById(tamanhoId).orElseThrow().getQuantidade()).isEqualTo(7);
        assertThat(outbox.findAll())
                .singleElement()
                .satisfies(evento -> assertThat(evento.getTopic()).isEqualTo(Topics.STOCK_RESERVED));
        assertThat(reservas.findByOrderIdAndLiberadaFalse(1L)).hasSize(1);
    }

    @Test
    void pedido_maior_que_o_estoque_e_rejeitado_sem_baixar_nada() {
        var produto = camisetaComEstoque(2);
        var tamanhoId = produto.getTamanhos().get(0).getId();

        estoque.reservar(2L, List.of(new Events.Item(produto.getId(), tamanhoId, "M", 5, 5000L)));

        assertThat(tamanhos.findById(tamanhoId).orElseThrow().getQuantidade())
                .as("estoque intacto")
                .isEqualTo(2);
        assertThat(outbox.findAll())
                .singleElement()
                .satisfies(evento -> assertThat(evento.getTopic()).isEqualTo(Topics.STOCK_REJECTED));
        assertThat(reservas.findByOrderIdAndLiberadaFalse(2L)).isEmpty();
    }

    @Test
    void pedido_com_dois_itens_do_mesmo_tamanho_soma_antes_de_conferir() {
        // Somar é o que impede passar 3 + 3 num estoque de 5 porque cada item,
        // olhado sozinho, cabia.
        var produto = camisetaComEstoque(5);
        var tamanhoId = produto.getTamanhos().get(0).getId();

        estoque.reservar(3L, List.of(
                new Events.Item(produto.getId(), tamanhoId, "M", 3, 5000L),
                new Events.Item(produto.getId(), tamanhoId, "M", 3, 5000L)));

        assertThat(tamanhos.findById(tamanhoId).orElseThrow().getQuantidade()).isEqualTo(5);
        assertThat(outbox.findAll())
                .singleElement()
                .satisfies(evento -> assertThat(evento.getTopic()).isEqualTo(Topics.STOCK_REJECTED));
    }

    @Test
    void cancelamento_devolve_exatamente_o_que_foi_reservado() {
        var produto = camisetaComEstoque(10);
        var tamanhoId = produto.getTamanhos().get(0).getId();
        estoque.reservar(4L, List.of(new Events.Item(produto.getId(), tamanhoId, "M", 4, 5000L)));

        estoque.devolver(4L);

        assertThat(tamanhos.findById(tamanhoId).orElseThrow().getQuantidade()).isEqualTo(10);
        assertThat(reservas.findByOrderIdAndLiberadaFalse(4L)).isEmpty();
    }

    @Test
    void devolver_duas_vezes_nao_infla_o_estoque() {
        // Reentrega de order.cancelled é certeza, não hipótese.
        var produto = camisetaComEstoque(10);
        var tamanhoId = produto.getTamanhos().get(0).getId();
        estoque.reservar(5L, List.of(new Events.Item(produto.getId(), tamanhoId, "M", 4, 5000L)));

        estoque.devolver(5L);
        estoque.devolver(5L);

        assertThat(tamanhos.findById(tamanhoId).orElseThrow().getQuantidade()).isEqualTo(10);
    }
}
