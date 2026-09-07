package br.ifce.uzusis.payment.webhook;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * O endpoint de webhook é a única coisa que diz que um pedido foi pago, e é
 * público. Sem estes três casos verificados, qualquer um marca pedido como
 * pago com um curl.
 */
class StripeWebhookControllerTest {

    private static final String SEGREDO = "whsec_segredo_de_teste";
    private static final String PAYLOAD = """
            {"id":"evt_1","type":"payment_intent.succeeded",
             "data":{"object":{"id":"pi_1","latest_charge":"ch_1"}}}""";

    private final WebhookRecebidoRepository recebidos = mock(WebhookRecebidoRepository.class);
    private final StripeWebhookController controller = new StripeWebhookController(recebidos, SEGREDO);

    @Test
    void recusa_assinatura_invalida_sem_gravar_nada() {
        var resposta = controller.receber(PAYLOAD, assinatura(PAYLOAD, "outro_segredo"));

        assertThat(resposta.getStatusCode().value()).isEqualTo(400);
        verify(recebidos, never()).save(any());
    }

    @Test
    void recusa_payload_alterado_depois_de_assinado() {
        // Assina um corpo e envia outro: é o ataque que a verificação existe
        // para pegar.
        var assinaturaDoOriginal = assinatura(PAYLOAD, SEGREDO);
        var adulterado = PAYLOAD.replace("pi_1", "pi_de_outra_pessoa");

        var resposta = controller.receber(adulterado, assinaturaDoOriginal);

        assertThat(resposta.getStatusCode().value()).isEqualTo(400);
        verify(recebidos, never()).save(any());
    }

    @Test
    void aceita_assinatura_valida_e_grava_para_processar_depois() {
        when(recebidos.existsById("evt_1")).thenReturn(false);

        var resposta = controller.receber(PAYLOAD, assinatura(PAYLOAD, SEGREDO));

        assertThat(resposta.getStatusCode().value()).isEqualTo(200);
        verify(recebidos).save(any(WebhookRecebido.class));
    }

    @Test
    void reentrega_do_mesmo_evento_responde_200_sem_gravar_de_novo() {
        // A Stripe reenvia sempre que dá timeout; a segunda entrega não pode
        // virar um segundo processamento.
        when(recebidos.existsById("evt_1")).thenReturn(true);

        var resposta = controller.receber(PAYLOAD, assinatura(PAYLOAD, SEGREDO));

        assertThat(resposta.getStatusCode().value()).isEqualTo(200);
        verify(recebidos, never()).save(any());
    }

    /** Monta o header Stripe-Signature do mesmo jeito que a Stripe monta. */
    private static String assinatura(String payload, String segredo) {
        long timestamp = Instant.now().getEpochSecond();
        return "t=" + timestamp + ",v1=" + hmac(timestamp + "." + payload, segredo);
    }

    private static String hmac(String conteudo, String segredo) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            var bytes = mac.doFinal(conteudo.getBytes(StandardCharsets.UTF_8));
            var hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
