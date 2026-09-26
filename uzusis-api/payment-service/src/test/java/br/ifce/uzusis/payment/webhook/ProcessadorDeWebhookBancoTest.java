package br.ifce.uzusis.payment.webhook;

import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.payment.PostgresDeTeste;
import br.ifce.uzusis.payment.pagamento.Pagamento;
import br.ifce.uzusis.payment.pagamento.PagamentoRepository;
import br.ifce.uzusis.payment.pagamento.StatusPagamento;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(PostgresDeTeste.class)
class ProcessadorDeWebhookBancoTest {

    @Autowired
    ProcessadorDeWebhook processador;

    @Autowired
    WebhookRecebidoRepository recebidos;

    @Autowired
    PagamentoRepository pagamentos;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void tipoIgnoradoFicaProcessado() {
        // Regressão B6: sem transação real, o marcarProcessado nunca era gravado
        // e o mesmo lote voltava a cada segundo.
        recebidos.save(new WebhookRecebido("evt_ignorado", "charge.updated", "{\"data\":{\"object\":{}}}"));

        processador.processarPendentes();

        assertThat(processado("evt_ignorado")).isTrue();
    }

    @Test
    void intentDesconhecidoFicaProcessado() {
        recebidos.save(new WebhookRecebido("evt_desconhecido", "payment_intent.succeeded",
                evento("pi_de_outro_pagamento_da_conta", "")));

        processador.processarPendentes();

        assertThat(processado("evt_desconhecido")).isTrue();
    }

    @Test
    void recusaPublicaMotivoEmPortuguesSemOTextoDaStripe() {
        criarPagamento(7001, "pi_recusa");
        recebidos.save(new WebhookRecebido("evt_recusa", "payment_intent.payment_failed",
                evento("pi_recusa", ",\"last_payment_error\":{\"message\":\"Your card was declined.\"}")));

        processador.processarPendentes();

        assertThat(processado("evt_recusa")).isTrue();
        var pagamento = pagamentos.findByOrderId(7001).orElseThrow();
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.FALHOU);
        assertThat(pagamento.getMotivoFalha()).isEqualTo("Your card was declined.");
        assertThat(outbox(7001, Topics.PAYMENT_FAILED)).singleElement().satisfies(payload -> assertThat(payload)
                .contains("Pagamento recusado")
                .doesNotContain("declined"));
    }

    @Test
    void aprovacaoConfirmaEPublicaPaymentSucceeded() {
        criarPagamento(7002, "pi_aprovado");
        recebidos.save(new WebhookRecebido("evt_aprovado", "payment_intent.succeeded",
                evento("pi_aprovado", ",\"latest_charge\":\"ch_aprovado\"")));

        processador.processarPendentes();

        assertThat(pagamentos.findByOrderId(7002).orElseThrow().getStatus()).isEqualTo(StatusPagamento.CONFIRMADO);
        assertThat(outbox(7002, Topics.PAYMENT_SUCCEEDED)).singleElement()
                .satisfies(payload -> assertThat(payload).contains("ch_aprovado"));
    }

    private void criarPagamento(long orderId, String intentId) {
        var pagamento = new Pagamento(orderId, "cliente", new BigDecimal("129.80"));
        pagamento.registrarIntent(intentId);
        pagamentos.save(pagamento);
    }

    private static String evento(String intentId, String camposExtras) {
        return "{\"data\":{\"object\":{\"id\":\"" + intentId + "\"" + camposExtras + "}}}";
    }

    private boolean processado(String eventId) {
        return jdbc.queryForObject("select processado from webhook_recebido where stripe_event_id = ?",
                Boolean.class, eventId);
    }

    private List<String> outbox(long orderId, String topico) {
        return jdbc.queryForList("select payload::text from outbox where aggregateid = ? and topic = ?",
                String.class, String.valueOf(orderId), topico);
    }
}
