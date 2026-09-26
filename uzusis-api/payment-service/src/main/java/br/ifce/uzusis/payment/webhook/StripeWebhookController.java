package br.ifce.uzusis.payment.webhook;

import com.stripe.model.Event;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/webhooks/stripe")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    private final WebhookRecebidoRepository recebidos;
    private final String signingSecret;

    public StripeWebhookController(WebhookRecebidoRepository recebidos,
                                   @Value("${uzusis.stripe.webhook-secret:}") String signingSecret) {
        this.recebidos = recebidos;
        this.signingSecret = signingSecret;
    }

    /**
     * Este é o único evento em que confiamos para dizer que um pedido foi pago
     * — resposta de frontend não vale como confirmação.
     *
     * <p>Duas coisas não são opcionais aqui:
     * <ul>
     *   <li>Verificar a assinatura. Endpoint sem verificação é endpoint público
     *       para qualquer um marcar pedido como pago.</li>
     *   <li>Responder rápido. A Stripe reenvia se der timeout, então o
     *       trabalho fica para o {@link ProcessadorDeWebhook}.</li>
     * </ul>
     *
     * <p>O corpo é lido como String crua de propósito: a assinatura é calculada
     * sobre os bytes exatos que a Stripe enviou, e qualquer
     * desserializar-e-serializar pelo caminho invalida a conferência.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<Void> receber(@RequestBody(required = false) String payload,
                                        @RequestHeader(value = "Stripe-Signature", required = false) String assinatura) {
        // Sem segredo, qualquer um calcularia uma assinatura "válida".
        if (signingSecret.isBlank()) {
            log.warn("Webhook recusado: STRIPE_WEBHOOK_SECRET vazio");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }

        Event evento;
        try {
            evento = Webhook.constructEvent(payload, assinatura, signingSecret);
        } catch (Exception e) {
            // Assinatura inválida ou expirada, cabeçalho ausente, e também corpo
            // que não é JSON: o constructEvent desserializa antes de conferir.
            log.warn("Webhook recusado: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        if (recebidos.existsById(evento.getId())) {
            log.debug("Webhook {} já recebido, ignorando reentrega", evento.getId());
            return ResponseEntity.ok().build();
        }

        recebidos.save(new WebhookRecebido(evento.getId(), evento.getType(), payload));
        return ResponseEntity.ok().build();
    }
}
