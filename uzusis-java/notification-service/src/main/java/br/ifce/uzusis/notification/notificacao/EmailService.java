package br.ifce.uzusis.notification.notificacao;

import br.ifce.uzusis.common.money.Money;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.util.Locale;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final NumberFormat REAIS = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));

    private final JavaMailSender mailSender;
    private final String remetente;

    public EmailService(JavaMailSender mailSender, @Value("${uzusis.email.remetente}") String remetente) {
        this.mailSender = mailSender;
        this.remetente = remetente;
    }

    public void pedidoPago(String destinatario, long orderId, long valorCentavos) {
        enviar(destinatario,
                "Uzusis - pedido #" + orderId + " confirmado",
                """
                Seu pagamento foi confirmado.

                Pedido: #%d
                Total: %s

                Assim que a peça for enviada, você recebe outro aviso.
                """.formatted(orderId, REAIS.format(Money.deCentavos(valorCentavos))));
    }

    public void pedidoCancelado(String destinatario, long orderId, String motivo) {
        enviar(destinatario,
                "Uzusis - pedido #" + orderId + " cancelado",
                """
                Seu pedido foi cancelado.

                Pedido: #%d
                Motivo: %s

                Se o pagamento já tinha sido feito, o estorno foi solicitado e
                aparece na fatura do cartão em alguns dias.
                """.formatted(orderId, motivo == null ? "não informado" : motivo));
    }

    private void enviar(String destinatario, String assunto, String corpo) {
        var mensagem = new SimpleMailMessage();
        mensagem.setFrom(remetente);
        mensagem.setTo(destinatario);
        mensagem.setSubject(assunto);
        mensagem.setText(corpo);
        mailSender.send(mensagem);
        log.info("E-mail \"{}\" enviado para {}", assunto, destinatario);
    }
}
