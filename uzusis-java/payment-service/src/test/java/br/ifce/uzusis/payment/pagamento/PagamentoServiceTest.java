package br.ifce.uzusis.payment.pagamento;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.outbox.OutboxPublisher;
import br.ifce.uzusis.payment.config.ConfiguracaoStripe;
import com.stripe.StripeClient;
import com.stripe.exception.ApiConnectionException;
import com.stripe.exception.InvalidRequestException;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import com.stripe.service.PaymentIntentService;
import com.stripe.service.RefundService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PagamentoServiceTest {

    private static final long PEDIDO = 1;
    private static final ConfiguracaoStripe LIGADO =
            new ConfiguracaoStripe("sk_test_x", "pk_test_x", "whsec_x", "", "brl");
    private static final ConfiguracaoStripe DESLIGADO = new ConfiguracaoStripe("", "", "", "", "brl");

    private final PagamentoRepository repositorio = mock(PagamentoRepository.class);
    private final OutboxPublisher outbox = mock(OutboxPublisher.class);
    private final StripeClient stripe = mock(StripeClient.class);
    private final PaymentIntentService intents = mock(PaymentIntentService.class);
    private final RefundService estornos = mock(RefundService.class);

    private PagamentoService servico;

    @BeforeEach
    void preparar() throws Exception {
        when(stripe.paymentIntents()).thenReturn(intents);
        when(stripe.refunds()).thenReturn(estornos);
        when(repositorio.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
        var estorno = new Refund();
        estorno.setId("re_1");
        when(estornos.create(any(RefundCreateParams.class), any(RequestOptions.class))).thenReturn(estorno);
        servico = new PagamentoService(repositorio, outbox, stripe, LIGADO);
    }

    // --- order.cancelled (§6.4 item 5): uma linha da tabela por teste ---

    @Test
    void cancelamentoSemPagamentoGravaCanceladoParaBarrarOIntentAtrasado() {
        when(repositorio.travarPorPedido(PEDIDO)).thenReturn(Optional.empty());

        servico.cancelarPorPedido(cancelado());

        verify(repositorio).save(argThat(p -> p.getStatus() == StatusPagamento.CANCELADO
                && p.getValor().signum() == 0 && p.getClienteSub().equals("dono")));
        verifyNoInteractions(intents, estornos, outbox);
    }

    @ParameterizedTest
    @EnumSource(value = StatusPagamento.class, names = {"CRIADO", "FALHOU"})
    void cancelamentoComIntentCancelaNaStripe(StatusPagamento status) throws Exception {
        var pagamento = pagamento(status, "pi_1");
        when(repositorio.travarPorPedido(PEDIDO)).thenReturn(Optional.of(pagamento));

        servico.cancelarPorPedido(cancelado());

        verify(intents).cancel(eq("pi_1"), chave("cancel-order-1-", pagamento));
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.CANCELADO);
        verifyNoInteractions(estornos, outbox);
    }

    @Test
    void cancelamentoDeIntentQueJaFoiPagoEstorna() throws Exception {
        var pagamento = pagamento(StatusPagamento.CRIADO, "pi_1");
        when(repositorio.travarPorPedido(PEDIDO)).thenReturn(Optional.of(pagamento));
        when(intents.cancel(eq("pi_1"), any(RequestOptions.class))).thenThrow(new InvalidRequestException(
                "You cannot cancel this PaymentIntent because it has a status of succeeded.", null, "req_1",
                "payment_intent_unexpected_state", 400, null));
        when(intents.retrieve("pi_1")).thenReturn(intent("succeeded"));

        servico.cancelarPorPedido(cancelado());

        verify(estornos).create(any(RefundCreateParams.class), chave("refund-order-1-", pagamento));
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.ESTORNADO);
        verify(outbox).publicar(any(), eq("1"), eq(Topics.PAYMENT_REFUNDED), any());
    }

    @ParameterizedTest
    @EnumSource(value = StatusPagamento.class, names = {"CRIADO", "FALHOU"})
    void cancelamentoSemIntentSoMudaOStatus(StatusPagamento status) {
        var pagamento = pagamento(status, null);
        when(repositorio.travarPorPedido(PEDIDO)).thenReturn(Optional.of(pagamento));

        servico.cancelarPorPedido(cancelado());

        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.CANCELADO);
        verifyNoInteractions(intents, estornos, outbox);
    }

    @Test
    void cancelamentoDePedidoPagoEstorna() throws Exception {
        var pagamento = pagamento(StatusPagamento.CONFIRMADO, "pi_1");
        when(repositorio.travarPorPedido(PEDIDO)).thenReturn(Optional.of(pagamento));

        servico.cancelarPorPedido(cancelado());

        var parametros = ArgumentCaptor.forClass(RefundCreateParams.class);
        verify(estornos).create(parametros.capture(), chave("refund-order-1-", pagamento));
        assertThat(parametros.getValue().getPaymentIntent()).isEqualTo("pi_1");
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.ESTORNADO);
        verify(outbox).publicar(any(), eq("1"), eq(Topics.PAYMENT_REFUNDED),
                eq(new Events.PaymentRefunded(PEDIDO, "pi_1", "re_1", 12980)));
    }

    @ParameterizedTest
    @EnumSource(value = StatusPagamento.class, names = {"CANCELADO", "ESTORNADO"})
    void cancelamentoRepetidoNaoFazNada(StatusPagamento status) {
        var pagamento = pagamento(status, "pi_1");
        when(repositorio.travarPorPedido(PEDIDO)).thenReturn(Optional.of(pagamento));

        servico.cancelarPorPedido(cancelado());

        assertThat(pagamento.getStatus()).isEqualTo(status);
        verifyNoInteractions(intents, estornos, outbox);
    }

    @Test
    void outroErroDaStripeNoCancelamentoFicaCanceladoSemRelancar() throws Exception {
        var pagamento = pagamento(StatusPagamento.CRIADO, "pi_1");
        when(repositorio.travarPorPedido(PEDIDO)).thenReturn(Optional.of(pagamento));
        when(intents.cancel(eq("pi_1"), any(RequestOptions.class))).thenThrow(new ApiConnectionException("timeout"));

        servico.cancelarPorPedido(cancelado());

        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.CANCELADO);
        verifyNoInteractions(estornos, outbox);
    }

    @Test
    void falhaNoEstornoNaoRelancaEDeixaParaAReconciliacao() throws Exception {
        var pagamento = pagamento(StatusPagamento.CONFIRMADO, "pi_1");
        when(repositorio.travarPorPedido(PEDIDO)).thenReturn(Optional.of(pagamento));
        when(estornos.create(any(RefundCreateParams.class), any(RequestOptions.class)))
                .thenThrow(new ApiConnectionException("timeout"));

        servico.cancelarPorPedido(cancelado());

        // CANCELADO com intent pago é o que a reconciliação noturna estorna.
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.CANCELADO);
        verifyNoInteractions(outbox);
    }

    // --- webhook de aprovação (§6.4 item 6) ---

    @Test
    void aprovacaoDePagamentoCriadoConfirmaEPublica() {
        var pagamento = pagamento(StatusPagamento.CRIADO, "pi_1");
        when(repositorio.travarPorIntent("pi_1")).thenReturn(Optional.of(pagamento));

        servico.confirmarPeloWebhook("pi_1", "ch_1");

        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.CONFIRMADO);
        verify(outbox).publicar(any(), eq("1"), eq(Topics.PAYMENT_SUCCEEDED),
                eq(new Events.PaymentSucceeded(PEDIDO, "pi_1", "ch_1", 12980)));
        verifyNoInteractions(estornos);
    }

    @ParameterizedTest
    @EnumSource(value = StatusPagamento.class, names = {"FALHOU", "CANCELADO"})
    void aprovacaoDePedidoJaCanceladoEstornaNaHoraSemPaymentSucceeded(StatusPagamento status) throws Exception {
        var pagamento = pagamento(status, "pi_1");
        when(repositorio.travarPorIntent("pi_1")).thenReturn(Optional.of(pagamento));

        servico.confirmarPeloWebhook("pi_1", "ch_1");

        verify(estornos).create(any(RefundCreateParams.class), chave("refund-order-1-", pagamento));
        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.ESTORNADO);
        verify(outbox, never()).publicar(any(), any(), eq(Topics.PAYMENT_SUCCEEDED), any());
        verify(outbox).publicar(any(), eq("1"), eq(Topics.PAYMENT_REFUNDED), any());
    }

    @Test
    void aprovacaoRepetidaNaoPublicaDeNovo() {
        var pagamento = pagamento(StatusPagamento.CONFIRMADO, "pi_1");
        when(repositorio.travarPorIntent("pi_1")).thenReturn(Optional.of(pagamento));

        servico.confirmarPeloWebhook("pi_1", "ch_1");

        verifyNoInteractions(outbox, estornos);
    }

    @Test
    void recusaPublicaMotivoFixoEGuardaODetalheLocal() {
        var pagamento = pagamento(StatusPagamento.CRIADO, "pi_1");
        when(repositorio.travarPorIntent("pi_1")).thenReturn(Optional.of(pagamento));

        servico.falharPeloWebhook("pi_1", "Your card was declined.");

        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.FALHOU);
        assertThat(pagamento.getMotivoFalha()).isEqualTo("Your card was declined.");
        verify(outbox).publicar(any(), eq("1"), eq(Topics.PAYMENT_FAILED),
                eq(new Events.PaymentFailed(PEDIDO, "pi_1", "Pagamento recusado")));
    }

    @Test
    void recusaDePagamentoJaCanceladoNaoPublica() {
        var pagamento = pagamento(StatusPagamento.CANCELADO, "pi_1");
        when(repositorio.travarPorIntent("pi_1")).thenReturn(Optional.of(pagamento));

        servico.falharPeloWebhook("pi_1", "Your card was declined.");

        assertThat(pagamento.getStatus()).isEqualTo(StatusPagamento.CANCELADO);
        verifyNoInteractions(outbox);
    }

    // --- order.created ---

    @Test
    void criaIntentSoDeCartaoComChaveDeIdempotenciaPorPagamento() throws Exception {
        when(repositorio.findByOrderId(PEDIDO)).thenReturn(Optional.empty());
        var criado = new PaymentIntent();
        criado.setId("pi_novo");
        when(intents.create(any(PaymentIntentCreateParams.class), any(RequestOptions.class))).thenReturn(criado);

        servico.criarIntent(criadoEvento());

        var parametros = ArgumentCaptor.forClass(PaymentIntentCreateParams.class);
        var opcoes = ArgumentCaptor.forClass(RequestOptions.class);
        verify(intents).create(parametros.capture(), opcoes.capture());
        assertThat(parametros.getValue().getPaymentMethodTypes()).containsExactly("card");
        assertThat(parametros.getValue().getAutomaticPaymentMethods()).isNull();
        assertThat(parametros.getValue().getAmount()).isEqualTo(12980L);

        var salvo = ArgumentCaptor.forClass(Pagamento.class);
        verify(repositorio).save(salvo.capture());
        assertThat(opcoes.getValue().getIdempotencyKey())
                .isEqualTo("order-1-" + salvo.getValue().getCriadoEm().toEpochSecond());
        assertThat(salvo.getValue().getPaymentIntentId()).isEqualTo("pi_novo");
    }

    @Test
    void semChavesFalhaComMotivoDeLojaNaoConfigurada() {
        servico = new PagamentoService(repositorio, outbox, stripe, DESLIGADO);
        when(repositorio.findByOrderId(PEDIDO)).thenReturn(Optional.empty());

        servico.criarIntent(criadoEvento());

        verify(repositorio).save(argThat(p -> p.getStatus() == StatusPagamento.FALHOU));
        verify(outbox).publicar(any(), eq("1"), eq(Topics.PAYMENT_FAILED),
                eq(new Events.PaymentFailed(PEDIDO, null, "Pagamento ainda não configurado na loja")));
        verifyNoInteractions(intents);
    }

    @Test
    void pedidoJaCanceladoNaoGanhaIntent() {
        when(repositorio.findByOrderId(PEDIDO)).thenReturn(Optional.of(pagamento(StatusPagamento.CANCELADO, null)));

        servico.criarIntent(criadoEvento());

        verifyNoInteractions(intents, outbox);
    }

    @Test
    void falhaNaCriacaoPublicaPagamentoRecusado() throws Exception {
        when(repositorio.findByOrderId(PEDIDO)).thenReturn(Optional.empty());
        when(intents.create(any(PaymentIntentCreateParams.class), any(RequestOptions.class)))
                .thenThrow(new InvalidRequestException("Amount must be at least 50 cents", "amount", "req_1",
                        "amount_too_small", 400, null));

        servico.criarIntent(criadoEvento());

        verify(outbox).publicar(any(), eq("1"), eq(Topics.PAYMENT_FAILED),
                eq(new Events.PaymentFailed(PEDIDO, null, "Pagamento recusado")));
    }

    // --- P2 ---

    @Test
    void clientSecretDevolveOIntentDaLinhaLocal() throws Exception {
        when(repositorio.findByOrderId(PEDIDO)).thenReturn(Optional.of(pagamento(StatusPagamento.CRIADO, "pi_1")));
        var intent = intent("requires_payment_method");
        intent.setClientSecret("pi_x_secret_y");
        when(intents.retrieve("pi_1")).thenReturn(intent);

        assertThat(servico.clientSecret(PEDIDO, "dono"))
                .isEqualTo(new PagamentoService.ClientSecretResposta("pi_x_secret_y", "pi_1"));
    }

    @Test
    void clientSecretCodigosDeErro() {
        assertErro(pagamento(StatusPagamento.CRIADO, "pi_1"), "intruso", 404, "Pagamento não encontrado");
        assertErro(pagamento(StatusPagamento.CRIADO, null), "dono", 404, "Cobrança ainda não criada, tente em instantes");
        assertErro(pagamento(StatusPagamento.CONFIRMADO, "pi_1"), "dono", 409, "Este pedido já foi pago");
        for (var status : List.of(StatusPagamento.FALHOU, StatusPagamento.CANCELADO, StatusPagamento.ESTORNADO)) {
            assertErro(pagamento(status, "pi_1"), "dono", 409, "Pagamento indisponível: pedido cancelado");
        }
        servico = new PagamentoService(repositorio, outbox, stripe, DESLIGADO);
        assertErro(pagamento(StatusPagamento.FALHOU, null), "dono", 503, "Pagamento ainda não configurado");
    }

    private void assertErro(Pagamento pagamento, String sub, int status, String motivo) {
        when(repositorio.findByOrderId(PEDIDO)).thenReturn(Optional.of(pagamento));
        assertThatThrownBy(() -> servico.clientSecret(PEDIDO, sub))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode().value()).isEqualTo(status);
                    assertThat(e.getReason()).isEqualTo(motivo);
                });
    }

    private static Pagamento pagamento(StatusPagamento status, String intentId) {
        var pagamento = new Pagamento(PEDIDO, "dono", new BigDecimal("129.80"));
        if (intentId != null) {
            pagamento.registrarIntent(intentId);
        }
        switch (status) {
            case CONFIRMADO -> pagamento.confirmar("ch_1");
            case FALHOU -> pagamento.falhar("recusado antes");
            case CANCELADO -> pagamento.cancelar();
            case ESTORNADO -> pagamento.estornar("re_0");
            case CRIADO -> {
            }
        }
        return pagamento;
    }

    private static PaymentIntent intent(String status) {
        var intent = new PaymentIntent();
        intent.setId("pi_1");
        intent.setStatus(status);
        return intent;
    }

    /** Com o criadoEm, como a do create: sem ele, a chave colide depois de um reset do banco. */
    private static RequestOptions chave(String prefixo, Pagamento pagamento) {
        var idempotencia = prefixo + pagamento.getCriadoEm().toEpochSecond();
        return argThat(opcoes -> idempotencia.equals(opcoes.getIdempotencyKey()));
    }

    private static Events.OrderCancelled cancelado() {
        return new Events.OrderCancelled(PEDIDO, "dono", "dono@exemplo.com", "Dona", "Pagamento recusado", true);
    }

    private static Events.OrderCreated criadoEvento() {
        return new Events.OrderCreated(PEDIDO, "dono", "dono@exemplo.com", 12980, List.of());
    }
}
