package br.ifce.uzusis.order.pedido;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.LeitorDeEvento;
import br.ifce.uzusis.order.PostgresDeTeste;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.AdicionarItem;
import br.ifce.uzusis.order.carrinho.CarrinhoDtos.ItemResposta;
import br.ifce.uzusis.order.carrinho.CarrinhoService;
import br.ifce.uzusis.order.catalogo.CatalogoClient;
import br.ifce.uzusis.order.catalogo.ProdutoResumo;
import br.ifce.uzusis.order.catalogo.ProdutoResumo.Foto;
import br.ifce.uzusis.order.catalogo.ProdutoResumo.Tamanho;
import br.ifce.uzusis.order.pedido.PedidoDtos.Cliente;
import br.ifce.uzusis.order.pedido.PedidoDtos.PedidoResposta;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeoutException;

import static br.ifce.uzusis.common.event.Topics.ORDER_CANCELLED;
import static br.ifce.uzusis.common.event.Topics.ORDER_CREATED;
import static br.ifce.uzusis.common.event.Topics.ORDER_PAID;
import static br.ifce.uzusis.common.event.Topics.ORDER_SHIPPED;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Sacola, pedido e saga contra Postgres de verdade, com o catálogo mockado.
 * Cada teste usa um cliente novo: o banco é o mesmo para a suíte inteira.
 */
@SpringBootTest
@AutoConfigureMockMvc // igual ao PedidoControllerSecurityTest: os dois dividem o mesmo contexto
@Import(PostgresDeTeste.class)
class PedidoServiceBancoTest {

    static final EnderecoEntrega ENDERECO_CE = new EnderecoEntrega(" Maria Souza ", "(85) 99999-0000", "60000000",
            "Rua A", "10", "", "Centro", "Fortaleza", "ce");

    @MockBean
    CatalogoClient catalogo;
    @Autowired
    PedidoService pedidos;
    @Autowired
    CarrinhoService sacola;
    @Autowired
    PedidoRepository repositorio;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    LeitorDeEvento leitor;
    @Autowired
    TransactionTemplate transacao;

    private final String cliente = "cliente-" + UUID.randomUUID();

    private static ProdutoResumo produto(long id, String nome, String preco, int estoqueM) {
        return new ProdutoResumo(id, nome, new BigDecimal(preco),
                List.of(new Tamanho(id * 10, "M", estoqueM), new Tamanho(id * 10 + 1, "P", 5)),
                List.of(new Foto("/storage/produtos/" + id + "/capa.jpg"), new Foto("/storage/produtos/" + id + "/2.jpg")));
    }

    private void noCatalogo(ProdutoResumo produto) {
        when(catalogo.obter(produto.id())).thenReturn(Optional.of(produto));
    }

    /** Um pedido CRIADO de 89,90 × quantidade, entregue no CE. */
    private PedidoResposta pedidoCom(String clienteSub, int quantidade) {
        noCatalogo(produto(1, "Blusa Linho", "89.90", 10));
        sacola.adicionar(clienteSub, new AdicionarItem(1, "M", quantidade));
        return pedidos.criar(clienteSub, clienteSub + "@exemplo.com", "Maria Souza", ENDERECO_CE);
    }

    private List<String> topicos(long pedidoId) {
        return jdbc.queryForList("select topic from outbox where aggregateid = ? order by created_at",
                String.class, String.valueOf(pedidoId));
    }

    private <T> T evento(long pedidoId, String topico, Class<T> tipo) {
        var envelope = jdbc.queryForObject("select payload::text from outbox where aggregateid = ? and topic = ?",
                String.class, String.valueOf(pedidoId), topico);
        return leitor.ler(envelope, tipo).payload();
    }

    private static void falhaCom(ThrowingCallable acao, int status, String detalhe) {
        assertThatThrownBy(acao).isInstanceOfSatisfying(ResponseStatusException.class, e -> {
            assertThat(e.getStatusCode().value()).isEqualTo(status);
            assertThat(e.getReason()).isEqualTo(detalhe);
        });
    }

    @Test
    void cria_pedido_com_endereco_e_frete_calculado_no_servidor() {
        noCatalogo(produto(1, "Blusa Linho Areia", "89.90", 5));
        sacola.adicionar(cliente, new AdicionarItem(1, "m", 2));

        var pedido = pedidos.criar(cliente, "maria@exemplo.com", "Maria Souza", ENDERECO_CE);

        assertThat(pedido.status()).isEqualTo(StatusPedido.CRIADO);
        assertThat(pedido.subtotal()).isEqualTo(new BigDecimal("179.80"));
        assertThat(pedido.frete()).isEqualTo(new BigDecimal("10.00"));
        assertThat(pedido.valorTotal()).isEqualTo(new BigDecimal("189.80"));
        assertThat(pedido.expiraEm()).isEqualTo(pedido.criadoEm().plusMinutes(30));
        assertThat(pedido.cliente()).isEqualTo(new Cliente("Maria Souza", "maria@exemplo.com"));
        assertThat(pedido.itens()).singleElement().satisfies(item -> {
            assertThat(item.nomeProduto()).isEqualTo("Blusa Linho Areia");
            assertThat(item.fotoUrl()).as("a capa").isEqualTo("/storage/produtos/1/capa.jpg");
            assertThat(item.tamanhoId()).isEqualTo(10);
            assertThat(item.valorTotal()).isEqualTo(new BigDecimal("179.80"));
        });

        var gravado = pedidos.obter(pedido.id(), cliente, false);
        assertThat(gravado.endereco()).isEqualTo(new EnderecoEntrega(
                "Maria Souza", "85999990000", "60000-000", "Rua A", "10", null, "Centro", "Fortaleza", "CE"));
        assertThat(gravado.valorTotal()).isEqualTo(new BigDecimal("189.80"));
        assertThat(sacola.obter(cliente).itens()).as("a sacola foi esvaziada").isEmpty();

        var criado = evento(pedido.id(), ORDER_CREATED, Events.OrderCreated.class);
        assertThat(criado.valorTotalCentavos()).as("inclui o frete").isEqualTo(18980);
        assertThat(criado.itens()).singleElement().satisfies(item -> {
            assertThat(item.valorUnitarioCentavos()).isEqualTo(8990);
            assertThat(item.quantidade()).isEqualTo(2);
        });
    }

    @Test
    void sacola_vazia_nao_vira_pedido() {
        falhaCom(() -> pedidos.criar(cliente, "maria@exemplo.com", "Maria", ENDERECO_CE), 422, "Sua sacola está vazia");
    }

    @Test
    void o6_cobra_o_preco_de_agora_do_catalogo() {
        noCatalogo(produto(1, "Blusa Linho", "89.90", 5));
        sacola.adicionar(cliente, new AdicionarItem(1, "M", 2));
        noCatalogo(produto(1, "Blusa Linho Nova", "99.90", 5));

        var pedido = pedidos.criar(cliente, "maria@exemplo.com", "Maria Souza", ENDERECO_CE);

        assertThat(pedido.itens()).singleElement().satisfies(item -> {
            assertThat(item.valorUnitario()).isEqualTo(new BigDecimal("99.90"));
            assertThat(item.nomeProduto()).isEqualTo("Blusa Linho Nova");
        });
        assertThat(pedido.subtotal()).isEqualTo(new BigDecimal("199.80"));
    }

    @Test
    void o6_recusa_item_desativado_ou_esgotado_e_deixa_a_sacola_como_estava() {
        noCatalogo(produto(1, "Blusa Linho", "89.90", 5));
        noCatalogo(new ProdutoResumo(2L, "Saia Midi", new BigDecimal("120.00"), List.of(new Tamanho(20L, "P", 3)), List.of()));
        sacola.adicionar(cliente, new AdicionarItem(1, "M", 2));
        sacola.adicionar(cliente, new AdicionarItem(2, "P", 2));
        var antes = sacola.obter(cliente);

        when(catalogo.obter(1L)).thenReturn(Optional.empty()); // desativado: o catálogo responde 404
        noCatalogo(new ProdutoResumo(2L, "Saia Midi", new BigDecimal("120.00"), List.of(new Tamanho(20L, "P", 1)), List.of()));

        falhaCom(() -> pedidos.criar(cliente, "maria@exemplo.com", "Maria", ENDERECO_CE),
                422, "Itens indisponíveis: Blusa Linho (M), Saia Midi (P)");
        assertThat(sacola.obter(cliente)).isEqualTo(antes);
        assertThat(pedidos.meusPedidos(cliente)).isEmpty();
    }

    @Test
    void o2_soma_na_linha_do_tamanho_e_respeita_estoque_e_99() {
        noCatalogo(produto(1, "Blusa Linho", "89.90", 5));
        var primeira = sacola.adicionar(cliente, new AdicionarItem(1, "M", 3));

        falhaCom(() -> sacola.adicionar(cliente, new AdicionarItem(1, "M", 3)),
                422, "Quantidade pedida excede o estoque do tamanho M (restam 2)");
        var somada = sacola.adicionar(cliente, new AdicionarItem(1, "m", 2));
        assertThat(somada.id()).isEqualTo(primeira.id());
        assertThat(somada.quantidade()).isEqualTo(5);
        falhaCom(() -> sacola.adicionar(cliente, new AdicionarItem(1, "M", 1)),
                422, "Quantidade pedida excede o estoque do tamanho M (restam 0)");
        falhaCom(() -> sacola.adicionar(cliente, new AdicionarItem(1, "GG", 1)), 422, "Este produto não tem o tamanho GG");

        noCatalogo(produto(2, "Meia", "9.90", 500));
        sacola.adicionar(cliente, new AdicionarItem(2, "M", 60));
        falhaCom(() -> sacola.adicionar(cliente, new AdicionarItem(2, "M", 40)), 422, "Máximo de 99 unidades por item");

        when(catalogo.obter(3L)).thenReturn(Optional.empty());
        falhaCom(() -> sacola.adicionar(cliente, new AdicionarItem(3, "M", 1)), 404, "Produto não encontrado");

        var resposta = sacola.obter(cliente);
        assertThat(resposta.itens()).hasSize(2);
        assertThat(resposta.quantidadeItens()).isEqualTo(65);
        assertThat(resposta.valorTotal()).isEqualTo(new BigDecimal("1043.50"));
    }

    @Test
    void o2_simultaneos_no_mesmo_tamanho_nao_criam_duas_linhas() throws Exception {
        noCatalogo(produto(1, "Blusa Linho", "89.90", 3));
        sacola.adicionar(cliente, new AdicionarItem(1, "P", 1)); // a sacola já existe: a corrida é na linha
        var primeiraGravou = new CountDownLatch(1);
        var liberar = new CountDownLatch(1);

        try (var abas = Executors.newFixedThreadPool(2)) {
            // Primeira aba: adiciona 2 M e segura a transação aberta.
            var primeira = abas.submit(() -> transacao.executeWithoutResult(status -> {
                sacola.adicionar(cliente, new AdicionarItem(1, "M", 2));
                primeiraGravou.countDown();
                aguardar(liberar);
            }));
            aguardar(primeiraGravou);
            // Segunda aba: mais 2 M. Sem a trava da sacola, ela não vê a linha
            // da primeira, cria outra e termina aqui mesmo; com a trava, espera.
            var segunda = abas.submit(() -> sacola.adicionar(cliente, new AdicionarItem(1, "M", 2)));
            try {
                segunda.get(2, SECONDS);
            } catch (TimeoutException travadaAtrasDaPrimeira) {
                // o esperado
            }
            liberar.countDown();

            primeira.get(10, SECONDS);
            assertThatThrownBy(() -> segunda.get(10, SECONDS)).cause()
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("Quantidade pedida excede o estoque do tamanho M (restam 1)");
        }
        assertThat(sacola.obter(cliente).itens()).filteredOn(item -> item.sigla().equals("M"))
                .singleElement().extracting(ItemResposta::quantidade).isEqualTo(2);
    }

    private static void aguardar(CountDownLatch sinal) {
        try {
            assertThat(sinal.await(10, SECONDS)).isTrue();
        } catch (InterruptedException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void o6_com_pedido_aguardando_pagamento_da_409_e_deixa_a_sacola() {
        pedidoCom(cliente, 1);
        sacola.adicionar(cliente, new AdicionarItem(1, "M", 1));

        falhaCom(() -> pedidos.criar(cliente, cliente + "@exemplo.com", "Maria Souza", ENDERECO_CE),
                409, "Você já tem um pedido aguardando pagamento.");
        assertThat(sacola.obter(cliente).itens()).hasSize(1);
        assertThat(pedidos.meusPedidos(cliente)).hasSize(1);
    }

    @Test
    void o3_e_o4_so_mexem_na_sacola_do_dono() {
        noCatalogo(produto(1, "Blusa Linho", "89.90", 5));
        var item = sacola.adicionar(cliente, new AdicionarItem(1, "M", 1));
        var intruso = "intruso-" + UUID.randomUUID();
        sacola.adicionar(intruso, new AdicionarItem(1, "P", 1));

        falhaCom(() -> sacola.alterar(intruso, item.id(), 2), 404, "Item não está na sua sacola");
        falhaCom(() -> sacola.remover(intruso, item.id()), 404, "Item não está na sua sacola");

        noCatalogo(produto(1, "Blusa Linho", "79.90", 5));
        var alterado = sacola.alterar(cliente, item.id(), 4);
        assertThat(alterado.quantidade()).isEqualTo(4);
        assertThat(alterado.valorUnitario()).as("preço de agora do catálogo").isEqualTo(new BigDecimal("79.90"));
        falhaCom(() -> sacola.alterar(cliente, item.id(), 6), 422,
                "Quantidade pedida excede o estoque do tamanho M (restam 5)");

        sacola.remover(cliente, item.id());
        assertThat(sacola.obter(cliente).itens()).isEmpty();
        assertThat(sacola.obter(intruso).itens()).hasSize(1);
    }

    @Test
    void enviar_e_receber_seguem_o_status_do_pedido() {
        long id = pedidoCom(cliente, 1).id();
        falhaCom(() -> pedidos.enviar(id), 409, "Só pedidos pagos podem ser enviados");
        falhaCom(() -> pedidos.receber(id, cliente), 409, "Pedido ainda não foi enviado");
        falhaCom(() -> pedidos.obter(id, "intruso", false), 404, "Pedido não encontrado");
        assertThat(pedidos.obter(id, "admin", true).id()).isEqualTo(id);

        pedidos.aoResponderEstoque(id, true, null);
        pedidos.aoResponderPagamento(id, true, "pi_1", null);

        var pago = pedidos.obter(id, cliente, false);
        assertThat(pago.status()).isEqualTo(StatusPedido.PAGO);
        assertThat(pago.pagoEm()).isNotNull();
        assertThat(pago.expiraEm()).isNull();
        var eventoPago = evento(id, ORDER_PAID, Events.OrderPaid.class);
        assertThat(eventoPago.clienteNome()).isEqualTo("Maria Souza");
        assertThat(eventoPago.valorTotalCentavos()).isEqualTo(9990);
        assertThat(eventoPago.freteCentavos()).isEqualTo(1000);
        assertThat(eventoPago.itens()).containsExactly(new Events.ItemResumo("Blusa Linho", "M", 1, 8990));
        assertThat(eventoPago.endereco().cep()).isEqualTo("60000-000");
        falhaCom(() -> pedidos.receber(id, cliente), 409, "Pedido ainda não foi enviado");

        var enviado = pedidos.enviar(id);
        assertThat(enviado.status()).isEqualTo(StatusPedido.ENVIADO);
        assertThat(enviado.enviadoEm()).isNotNull();
        assertThat(pedidos.enviar(id).status()).as("segundo clique: 200 sem evento novo").isEqualTo(StatusPedido.ENVIADO);

        falhaCom(() -> pedidos.receber(id, "intruso"), 404, "Pedido não encontrado");
        var recebido = pedidos.receber(id, cliente);
        assertThat(recebido.status()).isEqualTo(StatusPedido.RECEBIDO);
        assertThat(recebido.recebidoEm()).isNotNull();
        assertThat(pedidos.receber(id, cliente).recebidoEm()).isEqualTo(pedidos.obter(id, cliente, false).recebidoEm());
        assertThat(pedidos.enviar(id).status()).isEqualTo(StatusPedido.RECEBIDO);

        assertThat(topicos(id)).containsExactly(ORDER_CREATED, ORDER_PAID, ORDER_SHIPPED);
        var eventoEnviado = evento(id, ORDER_SHIPPED, Events.OrderShipped.class);
        assertThat(eventoEnviado.itens()).containsExactly(new Events.ItemResumo("Blusa Linho", "M", 1, 8990));
        assertThat(eventoEnviado.endereco().uf()).isEqualTo("CE");
    }

    @Test
    void pedido_vencido_expira_devolve_a_sacola_e_publica_o_cancelamento() {
        var pedido = pedidoCom(cliente, 2);

        new ExpiracaoDePedidos(repositorio, pedidos, Clock.offset(Clock.systemUTC(), Duration.ofMinutes(29)), 30)
                .expirarVencidos();
        assertThat(pedidos.obter(pedido.id(), cliente, false).status()).isEqualTo(StatusPedido.CRIADO);

        new ExpiracaoDePedidos(repositorio, pedidos, Clock.offset(Clock.systemUTC(), Duration.ofMinutes(31)), 30)
                .expirarVencidos();

        var expirado = pedidos.obter(pedido.id(), cliente, false);
        assertThat(expirado.status()).isEqualTo(StatusPedido.CANCELADO);
        assertThat(expirado.motivoCancelamento()).isEqualTo("Pagamento não concluído em 30 minutos");
        assertThat(expirado.sacolaRestaurada()).isTrue();
        assertThat(expirado.canceladoEm()).isNotNull();
        assertThat(expirado.expiraEm()).isNull();
        assertThat(sacola.obter(cliente).itens()).singleElement().satisfies(item -> {
            assertThat(item.quantidade()).isEqualTo(2);
            assertThat(item.nomeProduto()).isEqualTo("Blusa Linho");
            assertThat(item.valorUnitario()).isEqualTo(new BigDecimal("89.90"));
            assertThat(item.fotoUrl()).isEqualTo("/storage/produtos/1/capa.jpg");
        });
        var cancelado = evento(pedido.id(), ORDER_CANCELLED, Events.OrderCancelled.class);
        assertThat(cancelado.sacolaRestaurada()).isTrue();
        assertThat(cancelado.motivo()).isEqualTo("Pagamento não concluído em 30 minutos");

        // Pagamento que chega depois: só log. Quem estorna é o payment, pelo order.cancelled.
        pedidos.aoResponderPagamento(pedido.id(), true, "pi_tarde", null);
        assertThat(pedidos.obter(pedido.id(), cliente, false).status()).isEqualTo(StatusPedido.CANCELADO);
        assertThat(topicos(pedido.id())).containsExactly(ORDER_CREATED, ORDER_CANCELLED);
    }

    @Test
    void recusa_do_pagamento_devolve_a_sacola_somando_no_mesmo_tamanho() {
        var pedido = pedidoCom(cliente, 2);
        sacola.adicionar(cliente, new AdicionarItem(1, "M", 1)); // voltou a comprar o mesmo tamanho

        pedidos.aoResponderEstoque(pedido.id(), true, null);
        pedidos.aoResponderPagamento(pedido.id(), false, "pi_2", "Pagamento recusado");

        var cancelado = pedidos.obter(pedido.id(), cliente, false);
        assertThat(cancelado.status()).isEqualTo(StatusPedido.CANCELADO);
        assertThat(cancelado.motivoCancelamento()).isEqualTo("Pagamento recusado");
        assertThat(cancelado.sacolaRestaurada()).isTrue();
        assertThat(sacola.obter(cliente).itens()).singleElement().extracting(ItemResposta::quantidade).isEqualTo(3);
        assertThat(evento(pedido.id(), ORDER_CANCELLED, Events.OrderCancelled.class).sacolaRestaurada()).isTrue();
    }

    @Test
    void rejeicao_de_estoque_cancela_sem_devolver_a_sacola_nem_pedir_estorno() {
        var pedido = pedidoCom(cliente, 1);

        // Pago antes de o estoque responder: o order só cancela; o estorno é do payment.
        pedidos.aoResponderPagamento(pedido.id(), true, "pi_3", null);
        pedidos.aoResponderEstoque(pedido.id(), false, "Sem estoque: Blusa Linho (M)");

        var cancelado = pedidos.obter(pedido.id(), cliente, false);
        assertThat(cancelado.status()).isEqualTo(StatusPedido.CANCELADO);
        assertThat(cancelado.motivoCancelamento()).isEqualTo("Sem estoque: Blusa Linho (M)");
        assertThat(cancelado.sacolaRestaurada()).isFalse();
        assertThat(sacola.obter(cliente).itens()).isEmpty();

        var evento = evento(pedido.id(), ORDER_CANCELLED, Events.OrderCancelled.class);
        assertThat(evento.sacolaRestaurada()).isFalse();
        assertThat(evento.clienteNome()).isEqualTo("Maria Souza");
        assertThat(topicos(pedido.id())).containsExactly(ORDER_CREATED, ORDER_CANCELLED);
        assertThat(jdbc.queryForObject("select count(*) from outbox where topic like '%refund%'", Integer.class)).isZero();
    }
}
