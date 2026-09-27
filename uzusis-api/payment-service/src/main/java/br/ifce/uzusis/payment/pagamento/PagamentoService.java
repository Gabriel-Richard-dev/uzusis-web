package br.ifce.uzusis.payment.pagamento;

import br.ifce.uzusis.common.event.Events;
import br.ifce.uzusis.common.event.Topics;
import br.ifce.uzusis.common.money.Money;
import br.ifce.uzusis.common.outbox.OutboxPublisher;
import br.ifce.uzusis.payment.config.ConfiguracaoStripe;
import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class PagamentoService {

    private static final Logger log = LoggerFactory.getLogger(PagamentoService.class);
    private static final String AGREGADO = "Pagamento";

    /** O texto da Stripe (em inglês ou no idioma do cartão) nunca chega ao cliente. */
    static final String RECUSADO = "Pagamento recusado";
    static final String NAO_CONFIGURADO = "Pagamento ainda não configurado na loja";

    private final PagamentoRepository pagamentos;
    private final OutboxPublisher outbox;
    private final StripeClient stripe;
    private final ConfiguracaoStripe config;

    public PagamentoService(PagamentoRepository pagamentos, OutboxPublisher outbox, StripeClient stripe,
                            ConfiguracaoStripe config) {
        this.pagamentos = pagamentos;
        this.outbox = outbox;
        this.stripe = stripe;
        this.config = config;
    }

    public record ClientSecretResposta(String clientSecret, String paymentIntentId) {
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
        // Qualquer linha já existente encerra: evento repetido, ou CANCELADO
        // porque o order.cancelled chegou antes (tópicos diferentes).
        var existente = pagamentos.findByOrderId(pedido.orderId());
        if (existente.isPresent()) {
            log.debug("Pedido {} já tem pagamento em {}", pedido.orderId(), existente.get().getStatus());
            return;
        }

        var pagamento = pagamentos.save(new Pagamento(
                pedido.orderId(),
                pedido.clienteSub(),
                Money.deCentavos(pedido.valorTotalCentavos())));

        if (!config.habilitado()) {
            falhar(pagamento, null, NAO_CONFIGURADO, NAO_CONFIGURADO);
            return;
        }

        try {
            // Só cartão: Pix e boleto são assíncronos e não cabem na expiração
            // de 30 min do pedido.
            var parametros = PaymentIntentCreateParams.builder()
                    .setAmount(pedido.valorTotalCentavos())
                    .setCurrency(config.moeda())
                    .addPaymentMethodType("card")
                    .putMetadata("orderId", String.valueOf(pedido.orderId()))
                    .build();

            // Reentrega do evento devolve o MESMO intent.
            var opcoes = RequestOptions.builder().setIdempotencyKey(chave("order-", pagamento)).build();

            var intent = stripe.paymentIntents().create(parametros, opcoes);
            pagamento.registrarIntent(intent.getId());
            log.info("Intent {} criado para o pedido {}", intent.getId(), pedido.orderId());

        } catch (StripeException e) {
            // Sem intent não existe cobrança: o pedido tem que saber, senão
            // fica esperando um pagamento que nunca vem.
            log.error("Falha ao criar intent do pedido {}: {}", pedido.orderId(), e.getMessage(), e);
            falhar(pagamento, null, e.getMessage(), RECUSADO);
        }
    }

    /**
     * {@code payment_intent.succeeded}, pelo webhook ou pela reconciliação.
     * Se o pedido já caiu (FALHOU ou CANCELADO) e o cliente pagou mesmo assim,
     * o dinheiro volta na hora e o order nunca ouve falar desse pagamento.
     */
    @Transactional
    public void confirmarPeloWebhook(String paymentIntentId, String chargeId) {
        var achado = pagamentos.travarPorIntent(paymentIntentId);
        if (achado.isEmpty()) {
            // O stripe-cli encaminha eventos de toda a conta.
            log.warn("Pagamento aprovado para intent desconhecido {}, ignorado", paymentIntentId);
            return;
        }
        var pagamento = achado.get();

        switch (pagamento.getStatus()) {
            case CRIADO -> {
                pagamento.confirmar(chargeId);
                outbox.publicar(AGREGADO, String.valueOf(pagamento.getOrderId()), Topics.PAYMENT_SUCCEEDED,
                        new Events.PaymentSucceeded(pagamento.getOrderId(), paymentIntentId, chargeId,
                                Money.paraCentavos(pagamento.getValor())));
                log.info("Pagamento do pedido {} confirmado", pagamento.getOrderId());
            }
            case FALHOU, CANCELADO -> {
                log.warn("Pedido {} já cancelado ({}) recebeu pagamento: estornando",
                        pagamento.getOrderId(), pagamento.getStatus());
                estornar(pagamento);
            }
            case CONFIRMADO, ESTORNADO -> log.debug("Intent {} já resolvido ({})", paymentIntentId, pagamento.getStatus());
        }
    }

    /** {@code payment_intent.payment_failed}: uma recusa encerra o pedido. */
    @Transactional
    public void falharPeloWebhook(String paymentIntentId, String detalhe) {
        var achado = pagamentos.travarPorIntent(paymentIntentId);
        if (achado.isEmpty()) {
            log.warn("Recusa para intent desconhecido {}, ignorada", paymentIntentId);
            return;
        }
        var pagamento = achado.get();

        // Fora de ordem ou repetido (a Stripe avisa a cada tentativa recusada):
        // só o primeiro desfecho de um CRIADO conta.
        if (pagamento.getStatus() != StatusPagamento.CRIADO) {
            log.debug("Intent {} já resolvido ({}), recusa ignorada", paymentIntentId, pagamento.getStatus());
            return;
        }
        falhar(pagamento, paymentIntentId, detalhe, RECUSADO);
    }

    /**
     * Compensação da saga, e o único caminho de estorno: o pedido caiu, então
     * o intent não pode mais cobrar e, se já cobrou, o dinheiro volta.
     *
     * <p>Erro da Stripe nunca é relançado: o evento voltaria em loop até a DLQ.
     * O pagamento fica CANCELADO e a reconciliação noturna estorna se o intent
     * aparecer pago.
     */
    @Transactional
    public void cancelarPorPedido(Events.OrderCancelled pedido) {
        var achado = pagamentos.travarPorPedido(pedido.orderId());
        if (achado.isEmpty()) {
            // Um order.created atrasado encontra esta linha e não cria intent.
            var marcador = new Pagamento(pedido.orderId(), pedido.clienteSub(), BigDecimal.ZERO);
            marcador.cancelar();
            pagamentos.save(marcador);
            log.info("Pedido {} cancelado antes de ter pagamento", pedido.orderId());
            return;
        }
        var pagamento = achado.get();

        switch (pagamento.getStatus()) {
            case CRIADO, FALHOU -> cancelarIntent(pagamento);
            case CONFIRMADO -> estornar(pagamento);
            case CANCELADO, ESTORNADO -> log.debug("Pagamento do pedido {} já {}", pedido.orderId(), pagamento.getStatus());
        }
    }

    /**
     * O client_secret é buscado na Stripe a cada chamada em vez de guardado:
     * é credencial do checkout, não dado de negócio.
     */
    @Transactional(readOnly = true)
    public ClientSecretResposta clientSecret(long orderId, String clienteSub) {
        // De outro cliente é 404, igual a inexistente: não revela que existe.
        var pagamento = pagamentos.findByOrderId(orderId)
                .filter(p -> p.getClienteSub().equals(clienteSub))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Pagamento não encontrado"));

        if (!config.habilitado()) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Pagamento ainda não configurado");
        }
        switch (pagamento.getStatus()) {
            case CONFIRMADO -> throw new ResponseStatusException(CONFLICT, "Este pedido já foi pago");
            case FALHOU, CANCELADO, ESTORNADO ->
                    throw new ResponseStatusException(CONFLICT, "Pagamento indisponível: pedido cancelado");
            case CRIADO -> {
                if (pagamento.getPaymentIntentId() == null) {
                    throw new ResponseStatusException(NOT_FOUND, "Cobrança ainda não criada, tente em instantes");
                }
            }
        }

        try {
            var intent = stripe.paymentIntents().retrieve(pagamento.getPaymentIntentId());
            // O id vem da linha local: é o que o webhook vai citar.
            return new ClientSecretResposta(intent.getClientSecret(), pagamento.getPaymentIntentId());
        } catch (StripeException e) {
            throw new IllegalStateException("Falha ao consultar a Stripe", e);
        }
    }

    private void cancelarIntent(Pagamento pagamento) {
        if (pagamento.getPaymentIntentId() == null) {
            pagamento.cancelar();
            return;
        }
        try {
            stripe.paymentIntents().cancel(pagamento.getPaymentIntentId(),
                    RequestOptions.builder().setIdempotencyKey(chave("cancel-order-", pagamento)).build());
            pagamento.cancelar();
            log.info("Intent {} do pedido {} cancelado", pagamento.getPaymentIntentId(), pagamento.getOrderId());

        } catch (StripeException e) {
            // Corrida: o cliente pagou entre o cancelamento do pedido e agora.
            if ("payment_intent_unexpected_state".equals(e.getCode()) && pagoNaStripe(pagamento)) {
                estornar(pagamento);
                return;
            }
            log.error("Falha ao cancelar o intent {} do pedido {}: {}",
                    pagamento.getPaymentIntentId(), pagamento.getOrderId(), e.getMessage(), e);
            pagamento.cancelar();
        }
    }

    private boolean pagoNaStripe(Pagamento pagamento) {
        try {
            return "succeeded".equals(stripe.paymentIntents().retrieve(pagamento.getPaymentIntentId()).getStatus());
        } catch (StripeException e) {
            log.error("Falha ao consultar o intent {}: {}", pagamento.getPaymentIntentId(), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Idempotente pela chave: repetir depois de um erro de rede devolve o mesmo
     * estorno. Se a Stripe falhar, fica CANCELADO para a reconciliação noturna
     * tentar de novo; relançar só mandaria o evento para a DLQ.
     */
    private void estornar(Pagamento pagamento) {
        try {
            var estorno = stripe.refunds().create(
                    RefundCreateParams.builder()
                            .setPaymentIntent(pagamento.getPaymentIntentId())
                            .build(),
                    RequestOptions.builder().setIdempotencyKey(chave("refund-order-", pagamento)).build());

            pagamento.estornar(estorno.getId());
            outbox.publicar(AGREGADO, String.valueOf(pagamento.getOrderId()), Topics.PAYMENT_REFUNDED,
                    new Events.PaymentRefunded(pagamento.getOrderId(), pagamento.getPaymentIntentId(),
                            estorno.getId(), Money.paraCentavos(pagamento.getValor())));
            log.info("Estorno {} feito para o pedido {}", estorno.getId(), pagamento.getOrderId());

        } catch (StripeException e) {
            log.error("Falha ao estornar o pedido {} (a reconciliação noturna tenta de novo): {}",
                    pagamento.getOrderId(), e.getMessage(), e);
            pagamento.cancelar();
        }
    }

    /**
     * O criadoEm na chave evita colidir com um pedido de mesmo id depois de um
     * reset do banco: a Stripe guarda a chave por 24 h e, com outro intent, a
     * resposta seria um erro de idempotência (o cancel não cancelaria e o
     * estorno não estornaria).
     */
    private static String chave(String prefixo, Pagamento pagamento) {
        return prefixo + pagamento.getOrderId() + "-" + pagamento.getCriadoEm().toEpochSecond();
    }

    private void falhar(Pagamento pagamento, String paymentIntentId, String detalhe, String motivo) {
        pagamento.falhar(detalhe);
        outbox.publicar(AGREGADO, String.valueOf(pagamento.getOrderId()), Topics.PAYMENT_FAILED,
                new Events.PaymentFailed(pagamento.getOrderId(), paymentIntentId, motivo));
        log.info("Pagamento do pedido {} falhou: {}", pagamento.getOrderId(), detalhe);
    }
}
