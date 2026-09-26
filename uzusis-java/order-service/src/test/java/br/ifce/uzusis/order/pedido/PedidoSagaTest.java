package br.ifce.uzusis.order.pedido;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A máquina de estado da saga, sem infraestrutura nenhuma.
 *
 * <p>É o teste mais importante do serviço: webhook da Stripe e evento do
 * catálogo chegam fora de ordem, e a regra "trate por estado final, não por
 * sequência" só vale se estiver verificada. Cada caso aqui é uma ordem de
 * chegada diferente para o MESMO resultado.
 */
class PedidoSagaTest {

    private Pedido pedidoNovo() {
        var pedido = new Pedido("sub-123", "cliente@uzusis.local", "Cliente", null, new BigDecimal("10.00"));
        pedido.adicionarItem(1L, 10L, "M", 2, new BigDecimal("50.00"), "Blusa", null);
        return pedido;
    }

    @Test
    void so_paga_quando_estoque_e_pagamento_responderam_sim() {
        var pedido = pedidoNovo();
        assertThat(pedido.avaliar()).isEqualTo(Desfecho.PENDENTE);

        pedido.registrarEstoque(true, null);
        assertThat(pedido.avaliar()).as("falta o pagamento").isEqualTo(Desfecho.PENDENTE);

        pedido.registrarPagamento(true, "pi_1", null);
        assertThat(pedido.avaliar()).isEqualTo(Desfecho.PAGAR);
    }

    @Test
    void pagamento_antes_do_estoque_chega_no_mesmo_lugar() {
        var pedido = pedidoNovo();

        pedido.registrarPagamento(true, "pi_1", null);
        assertThat(pedido.avaliar()).isEqualTo(Desfecho.PENDENTE);

        pedido.registrarEstoque(true, null);
        assertThat(pedido.avaliar()).isEqualTo(Desfecho.PAGAR);
    }

    @Test
    void estoque_negado_cancela_sem_estorno_quando_ninguem_pagou() {
        var pedido = pedidoNovo();

        pedido.registrarEstoque(false, "Sem estoque para o tamanho M");

        assertThat(pedido.avaliar()).isEqualTo(Desfecho.CANCELAR);
    }

    @Test
    void estoque_negado_depois_do_pagamento_so_cancela() {
        // Pago e sem estoque: o pedido só cancela. Quem estorna é o payment,
        // ao consumir o order.cancelled (único caminho de estorno).
        var pedido = pedidoNovo();

        pedido.registrarPagamento(true, "pi_1", null);
        pedido.registrarEstoque(false, "Sem estoque: Blusa (M)");

        assertThat(pedido.avaliar()).isEqualTo(Desfecho.CANCELAR);
        assertThat(pedido.devolveASacolaAoCancelar()).as("rejeição de estoque não devolve a sacola").isFalse();
    }

    @Test
    void pagamento_recusado_cancela_mesmo_com_estoque_reservado() {
        var pedido = pedidoNovo();

        pedido.registrarEstoque(true, null);
        pedido.registrarPagamento(false, "pi_1", "Pagamento recusado");

        assertThat(pedido.avaliar()).isEqualTo(Desfecho.CANCELAR);
        assertThat(pedido.getMotivoCancelamento()).isEqualTo("Pagamento recusado");
        assertThat(pedido.devolveASacolaAoCancelar()).isTrue();
    }

    @Test
    void pagar_e_cancelar_carimbam_a_hora() {
        var pago = pedidoNovo();
        pago.pagar();
        assertThat(pago.getPagoEm()).isNotNull();

        var cancelado = pedidoNovo();
        cancelado.cancelar("Pagamento não concluído em 30 minutos", true);
        assertThat(cancelado.getCanceladoEm()).isNotNull();
        assertThat(cancelado.getStatus()).isEqualTo(StatusPedido.CANCELADO);
        assertThat(cancelado.isSacolaRestaurada()).isTrue();
    }

    @Test
    void pedido_ja_resolvido_ignora_evento_repetido_ou_atrasado() {
        var pedido = pedidoNovo();
        pedido.registrarEstoque(true, null);
        pedido.registrarPagamento(true, "pi_1", null);
        pedido.pagar();

        // Reentrega do Kafka, ou um payment_failed que a Stripe mandou fora de
        // ordem: nada disso pode reabrir um pedido fechado.
        pedido.registrarPagamento(false, "pi_1", "Recusado");
        assertThat(pedido.avaliar()).isEqualTo(Desfecho.PENDENTE);
        assertThat(pedido.getStatus()).isEqualTo(StatusPedido.PAGO);

        pedido.registrarEstoque(false, "Sem estoque");
        assertThat(pedido.avaliar()).isEqualTo(Desfecho.PENDENTE);
        assertThat(pedido.getStatus()).isEqualTo(StatusPedido.PAGO);
    }

    @Test
    void valor_total_e_a_soma_dos_itens_mais_o_frete() {
        var pedido = pedidoNovo();
        pedido.adicionarItem(2L, 20L, "G", 1, new BigDecimal("39.90"), "Saia", null);

        assertThat(pedido.getSubtotal()).isEqualByComparingTo(new BigDecimal("139.90"));
        assertThat(pedido.getValorTotal()).isEqualByComparingTo(new BigDecimal("149.90"));
    }

    @Test
    void motivo_longo_do_catalogo_cabe_na_coluna() {
        // "Sem estoque: " + cada item sem estoque, sem limite no catálogo;
        // motivo_cancelamento é VARCHAR(500).
        var pedido = pedidoNovo();

        pedido.registrarEstoque(false, "Sem estoque: " + "Vestido Longo Estampado Floral (M), ".repeat(20));
        pedido.cancelar(null, false);

        assertThat(pedido.getMotivoCancelamento()).hasSize(500).startsWith("Sem estoque: Vestido");
    }
}
