package br.ifce.uzusis.payment.webhook;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/**
 * Caixa de entrada dos webhooks da Stripe. A chave primária é o id do evento
 * NA STRIPE: inserir duas vezes é impossível, então a reentrega (que a Stripe
 * faz sempre que dá timeout) não cobra nem estorna em dobro.
 *
 * <p>Existe porque a regra é responder 200 rápido: o endpoint verifica a
 * assinatura, grava aqui e devolve. O processamento vem depois, num varredor.
 */
@Entity
@Table(name = "webhook_recebido")
public class WebhookRecebido {

    @Id
    @Column(name = "stripe_event_id", length = 100)
    private String stripeEventId;

    @Column(nullable = false, length = 100)
    private String tipo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String payload;

    @Column(nullable = false)
    private boolean processado;

    @Column(name = "recebido_em", nullable = false)
    private OffsetDateTime recebidoEm = OffsetDateTime.now();

    @Column(name = "erro", length = 1000)
    private String erro;

    protected WebhookRecebido() {
    }

    public WebhookRecebido(String stripeEventId, String tipo, String payload) {
        this.stripeEventId = stripeEventId;
        this.tipo = tipo;
        this.payload = payload;
    }

    public void marcarProcessado() {
        this.processado = true;
        this.erro = null;
    }

    public void registrarErro(String mensagem) {
        this.erro = mensagem == null ? null : mensagem.substring(0, Math.min(1000, mensagem.length()));
    }

    public String getStripeEventId() {
        return stripeEventId;
    }

    public String getTipo() {
        return tipo;
    }

    public String getPayload() {
        return payload;
    }
}
