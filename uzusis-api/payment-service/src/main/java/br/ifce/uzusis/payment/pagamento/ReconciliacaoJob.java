package br.ifce.uzusis.payment.pagamento;

import br.ifce.uzusis.payment.config.ConfiguracaoStripe;
import com.stripe.StripeClient;
import com.stripe.model.PaymentIntent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.function.BiConsumer;

/**
 * A Stripe é a fonte da verdade do pagamento; o banco daqui é cache. Webhook
 * perdido (stripe-cli parado, endpoint não cadastrado) ou estorno que falhou
 * deixam os dois divergentes, e ninguém descobre até o cliente reclamar.
 *
 * <p>Sem transação aqui: cada chamada ao serviço abre a sua, e um pagamento
 * com erro não desfaz os outros.
 */
@Component
public class ReconciliacaoJob {

    private static final Logger log = LoggerFactory.getLogger(ReconciliacaoJob.class);

    /** Checkout recém-aberto ainda é do cliente, não divergência. */
    private static final Duration CARENCIA = Duration.ofMinutes(2);

    private final PagamentoRepository pagamentos;
    private final PagamentoService servico;
    private final StripeClient stripe;
    private final ConfiguracaoStripe config;

    public ReconciliacaoJob(PagamentoRepository pagamentos, PagamentoService servico, StripeClient stripe,
                            ConfiguracaoStripe config) {
        this.pagamentos = pagamentos;
        this.servico = servico;
        this.stripe = stripe;
        this.config = config;
    }

    /**
     * Confirma o pagamento cujo webhook se perdeu muito antes da expiração de
     * 30 min do pedido, que senão viraria estorno.
     */
    @Scheduled(fixedDelayString = "${uzusis.stripe.reconciliar-ms:120000}")
    public void reconciliarPendentes() {
        if (!config.habilitado()) {
            return;
        }
        var pendentes = pagamentos.findByStatusAndPaymentIntentIdNotNullAndCriadoEmBefore(
                StatusPagamento.CRIADO, OffsetDateTime.now().minus(CARENCIA));
        conferir(pendentes, (pagamento, intent) -> {
            switch (intent.getStatus()) {
                case "succeeded" -> {
                    log.warn("Reconciliação: pedido {} está pago na Stripe e pendente aqui", pagamento.getOrderId());
                    servico.confirmarPeloWebhook(pagamento.getPaymentIntentId(), intent.getLatestCharge());
                }
                case "canceled" -> servico.falharPeloWebhook(pagamento.getPaymentIntentId(), "Intent cancelado na Stripe");
                // requires_payment_method, requires_action e afins são checkout
                // que o cliente não terminou.
                default -> log.debug("Pedido {} segue em {} na Stripe", pagamento.getOrderId(), intent.getStatus());
            }
        });
    }

    /**
     * Pedido que caiu mas foi pago na Stripe (webhook perdido, ou o estorno
     * falhou): o confirmar de um FALHOU/CANCELADO estorna.
     *
     * <p>ponytail: confere todos os FALHOU/CANCELADO com intent toda noite;
     * limitar por atualizado_em quando o volume pesar na API da Stripe.
     */
    @Scheduled(cron = "${uzusis.reconciliacao.cron:0 0 3 * * *}")
    public void estornarCancelados() {
        if (!config.habilitado()) {
            return;
        }
        var cancelados = pagamentos.findByStatusInAndPaymentIntentIdNotNull(
                List.of(StatusPagamento.FALHOU, StatusPagamento.CANCELADO));
        conferir(cancelados, (pagamento, intent) -> {
            if ("succeeded".equals(intent.getStatus())) {
                servico.confirmarPeloWebhook(pagamento.getPaymentIntentId(), intent.getLatestCharge());
            }
        });
    }

    private void conferir(List<Pagamento> lista, BiConsumer<Pagamento, PaymentIntent> acao) {
        for (var pagamento : lista) {
            try {
                acao.accept(pagamento, stripe.paymentIntents().retrieve(pagamento.getPaymentIntentId()));
            } catch (Exception e) {
                log.error("Reconciliação falhou para o pedido {}: {}", pagamento.getOrderId(), e.getMessage(), e);
            }
        }
        if (!lista.isEmpty()) {
            log.info("Reconciliação: {} pagamento(s) conferido(s)", lista.size());
        }
    }
}
