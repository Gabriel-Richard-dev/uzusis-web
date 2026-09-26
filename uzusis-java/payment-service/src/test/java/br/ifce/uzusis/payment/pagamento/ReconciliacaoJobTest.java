package br.ifce.uzusis.payment.pagamento;

import br.ifce.uzusis.payment.config.ConfiguracaoStripe;
import com.stripe.StripeClient;
import com.stripe.model.PaymentIntent;
import com.stripe.service.PaymentIntentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ReconciliacaoJobTest {

    private final PagamentoRepository repositorio = mock(PagamentoRepository.class);
    private final PagamentoService servico = mock(PagamentoService.class);
    private final StripeClient stripe = mock(StripeClient.class);
    private final PaymentIntentService intents = mock(PaymentIntentService.class);
    private final ReconciliacaoJob job = new ReconciliacaoJob(repositorio, servico, stripe,
            new ConfiguracaoStripe("sk_test_x", "pk_test_x", "whsec_x", "", "brl"));

    @BeforeEach
    void preparar() {
        when(stripe.paymentIntents()).thenReturn(intents);
    }

    @Test
    void pendentePagoNaStripeConfirma() throws Exception {
        pendentes(pagamento("pi_1"));
        when(intents.retrieve("pi_1")).thenReturn(intent("succeeded"));

        job.reconciliarPendentes();

        verify(servico).confirmarPeloWebhook("pi_1", "ch_1");
    }

    @Test
    void pendenteAindaNoCheckoutNaoMexe() throws Exception {
        pendentes(pagamento("pi_1"));
        when(intents.retrieve("pi_1")).thenReturn(intent("requires_payment_method"));

        job.reconciliarPendentes();

        verifyNoInteractions(servico);
    }

    @Test
    void pendenteCanceladoNaStripeFalha() throws Exception {
        pendentes(pagamento("pi_1"));
        when(intents.retrieve("pi_1")).thenReturn(intent("canceled"));

        job.reconciliarPendentes();

        verify(servico).falharPeloWebhook(eq("pi_1"), any());
    }

    @Test
    void canceladoPagoNaStripeVaiParaOEstorno() throws Exception {
        var pagamento = pagamento("pi_1");
        pagamento.cancelar();
        when(repositorio.findByStatusInAndPaymentIntentIdNotNull(anyCollection())).thenReturn(List.of(pagamento));
        when(intents.retrieve("pi_1")).thenReturn(intent("succeeded"));

        job.estornarCancelados();

        // confirmar de um CANCELADO estorna (PagamentoServiceTest cobre o estorno).
        verify(servico).confirmarPeloWebhook("pi_1", "ch_1");
    }

    @Test
    void semChavesNemConsulta() {
        var desligado = new ReconciliacaoJob(repositorio, servico, stripe,
                new ConfiguracaoStripe("", "", "", "", "brl"));

        desligado.reconciliarPendentes();
        desligado.estornarCancelados();

        verifyNoInteractions(repositorio, intents, servico);
    }

    private void pendentes(Pagamento... lista) {
        when(repositorio.findByStatusAndPaymentIntentIdNotNullAndCriadoEmBefore(eq(StatusPagamento.CRIADO), any()))
                .thenReturn(List.of(lista));
    }

    private static Pagamento pagamento(String intentId) {
        var pagamento = new Pagamento(1, "dono", BigDecimal.TEN);
        pagamento.registrarIntent(intentId);
        return pagamento;
    }

    private static PaymentIntent intent(String status) {
        var intent = new PaymentIntent();
        intent.setStatus(status);
        intent.setLatestCharge("ch_1");
        return intent;
    }
}
