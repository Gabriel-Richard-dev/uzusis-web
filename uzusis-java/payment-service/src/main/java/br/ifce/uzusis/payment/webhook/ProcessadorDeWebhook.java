package br.ifce.uzusis.payment.webhook;

import br.ifce.uzusis.payment.pagamento.PagamentoService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Varre a caixa de entrada e aplica os webhooks já recebidos.
 *
 * <p>Separar recebimento de processamento é o que permite responder 200 rápido
 * para a Stripe. E é o que faz o serviço se recuperar de uma queda: o que não
 * foi processado continua na tabela.
 *
 * <p>Transação por {@link TransactionTemplate}, e não @Transactional num método
 * desta classe: a chamada interna não passaria pelo proxy, e nada seria gravado.
 *
 * <p>ponytail: @Scheduled simples, sem ShedLock. Com mais de uma réplica, duas
 * varreduras podem pegar o mesmo lote — o dano é contido (a linha do pagamento
 * é travada e só a primeira transição publica), mas se o serviço for escalado,
 * entra ShedLock aqui.
 */
@Component
public class ProcessadorDeWebhook {

    private static final Logger log = LoggerFactory.getLogger(ProcessadorDeWebhook.class);
    private static final Limit LOTE = Limit.of(50);

    private final WebhookRecebidoRepository recebidos;
    private final PagamentoService pagamentos;
    private final ObjectMapper mapper;
    private final TransactionTemplate transacao;

    public ProcessadorDeWebhook(WebhookRecebidoRepository recebidos, PagamentoService pagamentos, ObjectMapper mapper,
                                PlatformTransactionManager transacoes) {
        this.recebidos = recebidos;
        this.pagamentos = pagamentos;
        this.mapper = mapper;
        this.transacao = new TransactionTemplate(transacoes);
    }

    @Scheduled(fixedDelayString = "${uzusis.webhook.intervalo-ms:1000}")
    public void processarPendentes() {
        var ids = recebidos.findByProcessadoFalseOrderByRecebidoEmAsc(LOTE).stream()
                .map(WebhookRecebido::getStripeEventId)
                .toList();
        ids.forEach(this::processar);
    }

    private void processar(String eventId) {
        try {
            // Aplicar e marcar processado na mesma transação: ou os dois, ou nenhum.
            transacao.executeWithoutResult(status -> {
                var webhook = recebidos.findById(eventId).orElseThrow();
                aplicar(webhook);
                webhook.marcarProcessado();
            });
        } catch (RuntimeException e) {
            // Não marca processado: a próxima varredura tenta de novo. O erro
            // fica gravado para o suporte ver sem precisar caçar log.
            log.error("Falha ao processar o webhook {}: {}", eventId, e.getMessage(), e);
            transacao.executeWithoutResult(status ->
                    recebidos.findById(eventId).ifPresent(webhook -> webhook.registrarErro(e.getMessage())));
        }
    }

    private void aplicar(WebhookRecebido webhook) {
        switch (webhook.getTipo()) {
            case "payment_intent.succeeded" -> {
                var objeto = objetoDoEvento(webhook);
                pagamentos.confirmarPeloWebhook(texto(objeto, "id"), texto(objeto, "latest_charge"));
            }
            case "payment_intent.payment_failed" -> {
                // A mensagem da Stripe vai só para o log e para motivo_falha.
                var objeto = objetoDoEvento(webhook);
                pagamentos.falharPeloWebhook(texto(objeto, "id"), texto(objeto.path("last_payment_error"), "message"));
            }
            // Os outros tipos são assinados e válidos, só não interessam
            // ao domínio. Marcar como processado evita varrer para sempre.
            default -> log.debug("Webhook {} do tipo {} ignorado", webhook.getStripeEventId(), webhook.getTipo());
        }
    }

    /**
     * O JSON cru é lido com Jackson em vez do desserializador da Stripe de
     * propósito: quando a versão da API do evento é diferente da versão da
     * biblioteca, o desserializador devolve vazio e o webhook se perde em
     * silêncio. Os campos que interessam estão sempre no mesmo lugar.
     */
    private JsonNode objetoDoEvento(WebhookRecebido webhook) {
        JsonNode objeto;
        try {
            objeto = mapper.readTree(webhook.getPayload()).path("data").path("object");
        } catch (Exception e) {
            throw new IllegalStateException("Payload de webhook ilegível", e);
        }
        if (objeto.isMissingNode()) {
            throw new IllegalStateException("Webhook sem data.object");
        }
        return objeto;
    }

    private static String texto(JsonNode objeto, String campo) {
        var valor = objeto.path(campo);
        return valor.isMissingNode() || valor.isNull() ? null : valor.asText();
    }
}
