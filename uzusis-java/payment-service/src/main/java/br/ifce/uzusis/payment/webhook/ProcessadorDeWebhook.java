package br.ifce.uzusis.payment.webhook;

import br.ifce.uzusis.payment.pagamento.PagamentoService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Varre a caixa de entrada e aplica os webhooks já recebidos.
 *
 * <p>Separar recebimento de processamento é o que permite responder 200 rápido
 * para a Stripe. E é o que faz o serviço se recuperar de uma queda: o que não
 * foi processado continua na tabela.
 *
 * <p>ponytail: @Scheduled simples, sem ShedLock. Com mais de uma réplica, duas
 * varreduras podem pegar o mesmo lote — o dano é contido (o estado do pagamento
 * é final e o publicar só acontece na primeira transição), mas se o serviço for
 * escalado, entra ShedLock aqui.
 */
@Component
public class ProcessadorDeWebhook {

    private static final Logger log = LoggerFactory.getLogger(ProcessadorDeWebhook.class);
    private static final Limit LOTE = Limit.of(50);

    private final WebhookRecebidoRepository recebidos;
    private final PagamentoService pagamentos;
    private final ObjectMapper mapper;

    public ProcessadorDeWebhook(WebhookRecebidoRepository recebidos, PagamentoService pagamentos, ObjectMapper mapper) {
        this.recebidos = recebidos;
        this.pagamentos = pagamentos;
        this.mapper = mapper;
    }

    @Scheduled(fixedDelayString = "${uzusis.webhook.intervalo-ms:1000}")
    public void processarPendentes() {
        recebidos.findByProcessadoFalseOrderByRecebidoEmAsc(LOTE).forEach(this::processar);
    }

    @Transactional
    void processar(WebhookRecebido webhook) {
        try {
            var objeto = objetoDoEvento(webhook);
            var intentId = texto(objeto, "id");

            switch (webhook.getTipo()) {
                case "payment_intent.succeeded" -> pagamentos.confirmarPeloWebhook(
                        intentId, texto(objeto, "latest_charge"));

                case "payment_intent.payment_failed" -> pagamentos.falharPeloWebhook(
                        intentId, motivoDaFalha(objeto));

                // Os outros tipos são assinados e válidos, só não interessam
                // ao domínio. Marcar como processado evita varrer para sempre.
                default -> log.debug("Webhook {} do tipo {} ignorado", webhook.getStripeEventId(), webhook.getTipo());
            }

            webhook.marcarProcessado();

        } catch (RuntimeException e) {
            // Não marca processado: a próxima varredura tenta de novo. O erro
            // fica gravado para o suporte ver sem precisar caçar log.
            log.error("Falha ao processar o webhook {} ({}): {}",
                    webhook.getStripeEventId(), webhook.getTipo(), e.getMessage(), e);
            webhook.registrarErro(e.getMessage());
        }
    }

    /**
     * O JSON cru é lido com Jackson em vez do desserializador da Stripe de
     * propósito: quando a versão da API do evento é diferente da versão da
     * biblioteca, o desserializador devolve vazio e o webhook se perde em
     * silêncio. Os dois campos que interessam estão sempre no mesmo lugar.
     */
    private JsonNode objetoDoEvento(WebhookRecebido webhook) {
        try {
            var objeto = mapper.readTree(webhook.getPayload()).path("data").path("object");
            if (objeto.isMissingNode()) {
                throw new IllegalStateException("Webhook sem data.object");
            }
            return objeto;
        } catch (Exception e) {
            throw new IllegalStateException("Payload de webhook ilegível", e);
        }
    }

    private static String motivoDaFalha(JsonNode objeto) {
        var mensagem = objeto.path("last_payment_error").path("message").asText(null);
        return mensagem != null ? mensagem : "Pagamento recusado pela Stripe";
    }

    private static String texto(JsonNode objeto, String campo) {
        var valor = objeto.path(campo);
        return valor.isMissingNode() || valor.isNull() ? null : valor.asText();
    }
}
