package br.ifce.uzusis.payment.pagamento;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * O registro local do pagamento.
 *
 * <p>A fonte da verdade é a Stripe; isto aqui é cache. paymentIntentId e
 * chargeId ficam guardados porque sem eles o suporte não consegue achar a
 * cobrança no painel da Stripe — e a reconciliação diária não tem por onde
 * comparar.
 */
@Entity
@Table(name = "pagamento")
public class Pagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, unique = true)
    private long orderId;

    @Column(name = "cliente_sub", nullable = false, length = 64)
    private String clienteSub;

    @Column(name = "payment_intent_id", length = 100)
    private String paymentIntentId;

    @Column(name = "charge_id", length = 100)
    private String chargeId;

    @Column(name = "refund_id", length = 100)
    private String refundId;

    /** No banco NUMERIC(19,4); em centavos só no contrato do evento e na Stripe. */
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusPagamento status = StatusPagamento.CRIADO;

    @Column(name = "motivo_falha", length = 500)
    private String motivoFalha;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm = OffsetDateTime.now();

    @Column(name = "atualizado_em")
    private OffsetDateTime atualizadoEm;

    protected Pagamento() {
    }

    public Pagamento(long orderId, String clienteSub, BigDecimal valor) {
        this.orderId = orderId;
        this.clienteSub = clienteSub;
        this.valor = valor;
    }

    public void registrarIntent(String paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
        this.atualizadoEm = OffsetDateTime.now();
    }

    /**
     * @return false se o pagamento já estava confirmado — webhook repetido não
     *         gera evento de novo.
     */
    public boolean confirmar(String chargeId) {
        if (status == StatusPagamento.CONFIRMADO) {
            return false;
        }
        this.chargeId = chargeId;
        this.status = StatusPagamento.CONFIRMADO;
        this.atualizadoEm = OffsetDateTime.now();
        return true;
    }

    public boolean falhar(String motivo) {
        // Estado final: um payment_failed que chega depois do succeeded (fora
        // de ordem, como a Stripe avisa que acontece) não derruba a cobrança
        // que já foi confirmada.
        if (status == StatusPagamento.CONFIRMADO || status == StatusPagamento.FALHOU) {
            return false;
        }
        this.motivoFalha = motivo;
        this.status = StatusPagamento.FALHOU;
        this.atualizadoEm = OffsetDateTime.now();
        return true;
    }

    public boolean estornar(String refundId) {
        if (status == StatusPagamento.ESTORNADO) {
            return false;
        }
        this.refundId = refundId;
        this.status = StatusPagamento.ESTORNADO;
        this.atualizadoEm = OffsetDateTime.now();
        return true;
    }

    public Long getId() {
        return id;
    }

    public long getOrderId() {
        return orderId;
    }

    public String getClienteSub() {
        return clienteSub;
    }

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public String getChargeId() {
        return chargeId;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public StatusPagamento getStatus() {
        return status;
    }
}
