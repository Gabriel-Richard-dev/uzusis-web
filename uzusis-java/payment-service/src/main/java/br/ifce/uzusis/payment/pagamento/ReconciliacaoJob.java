package br.ifce.uzusis.payment.pagamento;

import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reconciliação diária: a Stripe é a fonte da verdade do pagamento, o banco
 * daqui é cache. Webhook perdido, DLQ não drenada ou queda no meio do
 * processamento deixam pagamento pago na Stripe e pendente aqui — e ninguém
 * descobre até o cliente reclamar.
 *
 * <p>Este job fecha essa diferença: pergunta à Stripe o estado real de cada
 * pagamento que ficou pendente e aplica o desfecho, publicando o evento que
 * faltou.
 */
@Component
public class ReconciliacaoJob {

    private static final Logger log = LoggerFactory.getLogger(ReconciliacaoJob.class);

    private final PagamentoRepository pagamentos;
    private final PagamentoService servico;
    private final StripeClient stripe;

    public ReconciliacaoJob(PagamentoRepository pagamentos, PagamentoService servico, StripeClient stripe) {
        this.pagamentos = pagamentos;
        this.servico = servico;
        this.stripe = stripe;
    }

    @Scheduled(cron = "${uzusis.reconciliacao.cron:0 0 3 * * *}")
    @Transactional
    public void reconciliar() {
        var pendentes = pagamentos.findByStatus(StatusPagamento.CRIADO);
        int corrigidos = 0;

        for (var pagamento : pendentes) {
            if (pagamento.getPaymentIntentId() == null) {
                continue;
            }
            try {
                var intent = stripe.paymentIntents().retrieve(pagamento.getPaymentIntentId());
                switch (intent.getStatus()) {
                    case "succeeded" -> {
                        log.warn("Reconciliação: pedido {} está pago na Stripe e pendente aqui",
                                pagamento.getOrderId());
                        servico.confirmarPeloWebhook(pagamento.getPaymentIntentId(), intent.getLatestCharge());
                        corrigidos++;
                    }
                    case "canceled" -> {
                        servico.falharPeloWebhook(pagamento.getPaymentIntentId(), "Cancelado na Stripe");
                        corrigidos++;
                    }
                    // requires_payment_method, requires_action e afins são
                    // checkout que o cliente não terminou: não é divergência.
                    default -> log.debug("Pedido {} segue em {} na Stripe",
                            pagamento.getOrderId(), intent.getStatus());
                }
            } catch (StripeException e) {
                log.error("Reconciliação falhou para o pedido {}: {}", pagamento.getOrderId(), e.getMessage());
            }
        }

        log.info("Reconciliação concluída: {} pendente(s) conferido(s), {} corrigido(s)", pendentes.size(), corrigidos);
    }
}
