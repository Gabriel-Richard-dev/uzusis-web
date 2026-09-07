package br.ifce.uzusis.payment.pagamento;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.money.Money;
import br.ifce.uzusis.common.outbox.OutboxPublisher;
import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class PagamentoService {

    private static final Logger log = LoggerFactory.getLogger(PagamentoService.class);
    private static final String AGREGADO = "Pagamento";

    private final PagamentoRepository pagamentos;
    private final OutboxPublisher outbox;
    private final StripeClient stripe;
    private final String moeda;

    public PagamentoService(PagamentoRepository pagamentos, OutboxPublisher outbox, StripeClient stripe,
                            @Value("${uzusis.stripe.moeda:brl}") String moeda) {
        this.pagamentos = pagamentos;
        this.outbox = outbox;
        this.stripe = stripe;
        this.moeda = moeda;
    }

    /**
     * Cria o PaymentIntent do pedido. O cartão nunca passa por aqui: o
     * frontend confirma direto com a Stripe usando o client_secret, e é isso
     * que mantém o backend fora do escopo pesado de PCI.
     *
     * <p>ponytail: a chamada à Stripe acontece dentro da transação do consumo
     * idempotente, então a conexão do banco fica presa durante o HTTP. Está
     * aceitável neste volume e é seguro porque a idempotency_key torna a
     * repetição inofensiva; se o pool começar a sofrer, quebrar em duas
     * transações com a chamada no meio.
     */
    @Transactional
    public void criarIntent(Events.OrderCreated pedido) {
        var existente = pagamentos.findByOrderId(pedido.orderId());
        if (existente.isPresent() && existente.get().getPaymentIntentId() != null) {
            log.debug("Pedido {} já tem intent {}", pedido.orderId(), existente.get().getPaymentIntentId());
            return;
        }

        var pagamento = existente.orElseGet(() -> pagamentos.save(new Pagamento(
                pedido.orderId(),
                pedido.clienteSub(),
                Money.deCentavos(pedido.valorTotalCentavos()))));

        try {
            var parametros = PaymentIntentCreateParams.builder()
                    .setAmount(pedido.valorTotalCentavos())
                    .setCurrency(moeda)
                    .putMetadata("orderId", String.valueOf(pedido.orderId()))
                    .setAutomaticPaymentMethods(PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                            .setEnabled(true)
                            .build())
                    .build();

            // idempotency_key = pedido: se o evento for reentregue, a Stripe
            // devolve o MESMO intent em vez de criar uma segunda cobrança.
            var opcoes = RequestOptions.builder()
                    .setIdempotencyKey("order-" + pedido.orderId())
                    .build();

            var intent = stripe.paymentIntents().create(parametros, opcoes);
            pagamento.registrarIntent(intent.getId());
            log.info("Intent {} criado para o pedido {}", intent.getId(), pedido.orderId());

        } catch (StripeException e) {
            // Sem intent não existe cobrança: o pedido tem que saber, senão
            // fica PENDENTE para sempre esperando um pagamento que nunca vem.
            log.error("Falha ao criar intent do pedido {}: {}", pedido.orderId(), e.getMessage(), e);
            pagamento.falhar("Falha ao criar cobrança: " + e.getMessage());
            outbox.publicar(AGREGADO, String.valueOf(pedido.orderId()), Topics.PAYMENT_FAILED,
                    new Events.PaymentFailed(pedido.orderId(), null, e.getMessage()));
        }
    }

    @Transactional
    public void confirmarPeloWebhook(String paymentIntentId, String chargeId) {
        var pagamento = pagamentos.travarPorIntent(paymentIntentId)
                .orElseThrow(() -> new IllegalStateException("Webhook para intent desconhecido: " + paymentIntentId));

        if (!pagamento.confirmar(chargeId)) {
            log.debug("Intent {} já estava confirmado", paymentIntentId);
            return;
        }

        outbox.publicar(AGREGADO, String.valueOf(pagamento.getOrderId()), Topics.PAYMENT_SUCCEEDED,
                new Events.PaymentSucceeded(pagamento.getOrderId(), paymentIntentId, chargeId,
                        Money.paraCentavos(pagamento.getValor())));
        log.info("Pagamento do pedido {} confirmado", pagamento.getOrderId());
    }

    @Transactional
    public void falharPeloWebhook(String paymentIntentId, String motivo) {
        var pagamento = pagamentos.travarPorIntent(paymentIntentId)
                .orElseThrow(() -> new IllegalStateException("Webhook para intent desconhecido: " + paymentIntentId));

        if (!pagamento.falhar(motivo)) {
            log.debug("Intent {} já resolvido, falha fora de ordem ignorada", paymentIntentId);
            return;
        }

        outbox.publicar(AGREGADO, String.valueOf(pagamento.getOrderId()), Topics.PAYMENT_FAILED,
                new Events.PaymentFailed(pagamento.getOrderId(), paymentIntentId, motivo));
        log.info("Pagamento do pedido {} falhou: {}", pagamento.getOrderId(), motivo);
    }

    /** Compensação da saga: o pedido caiu, o dinheiro volta. */
    @Transactional
    public void estornar(Events.RefundRequested pedido) {
        var pagamento = pagamentos.travarPorPedido(pedido.orderId())
                .orElseThrow(() -> new IllegalStateException("Estorno de pedido sem pagamento: " + pedido.orderId()));

        if (pagamento.getStatus() != StatusPagamento.CONFIRMADO) {
            log.info("Pedido {} não está pago ({}), nada a estornar", pedido.orderId(), pagamento.getStatus());
            return;
        }

        try {
            var estorno = stripe.refunds().create(
                    RefundCreateParams.builder()
                            .setPaymentIntent(pagamento.getPaymentIntentId())
                            .build(),
                    RequestOptions.builder()
                            .setIdempotencyKey("refund-order-" + pedido.orderId())
                            .build());

            pagamento.estornar(estorno.getId());
            outbox.publicar(AGREGADO, String.valueOf(pedido.orderId()), Topics.PAYMENT_REFUNDED,
                    new Events.PaymentRefunded(pedido.orderId(), pagamento.getPaymentIntentId(),
                            estorno.getId(), Money.paraCentavos(pagamento.getValor())));
            log.info("Estorno {} feito para o pedido {}", estorno.getId(), pedido.orderId());

        } catch (StripeException e) {
            // Estorno é dinheiro do cliente: não engolir. A exceção devolve o
            // evento para a retentativa e, esgotada, para a DLQ com alerta.
            log.error("Falha ao estornar o pedido {}: {}", pedido.orderId(), e.getMessage(), e);
            throw new IllegalStateException("Falha ao estornar o pedido " + pedido.orderId(), e);
        }
    }

    /**
     * O client_secret é buscado na Stripe a cada chamada em vez de guardado:
     * é credencial de uso único do checkout, não dado de negócio.
     */
    @Transactional(readOnly = true)
    public String clientSecret(long orderId, String clienteSub) {
        var pagamento = pagamentos.findByOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Pagamento não encontrado"));

        if (!pagamento.getClienteSub().equals(clienteSub)) {
            throw new ResponseStatusException(FORBIDDEN, "Pagamento de outro cliente");
        }
        if (pagamento.getPaymentIntentId() == null) {
            throw new ResponseStatusException(NOT_FOUND, "Cobrança ainda não criada, tente em instantes");
        }

        try {
            return stripe.paymentIntents().retrieve(pagamento.getPaymentIntentId()).getClientSecret();
        } catch (StripeException e) {
            throw new IllegalStateException("Falha ao consultar a Stripe", e);
        }
    }
}
