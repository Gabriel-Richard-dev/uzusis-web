package br.ifce.uzusis.notification.notificacao;

import br.ifce.uzusis.notification.notificacao.EmailTemplates.Email;
import jakarta.mail.MessagingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String remetente;

    public EmailService(JavaMailSender mailSender, @Value("${uzusis.email.remetente}") String remetente) {
        this.mailSender = mailSender;
        this.remetente = remetente;
    }

    /** Multipart com HTML e texto: o cliente de e-mail que não mostra HTML mostra o texto. */
    public void enviar(String destinatario, Email email) {
        var mensagem = mailSender.createMimeMessage();
        try {
            var helper = new MimeMessageHelper(mensagem, true, "UTF-8");
            helper.setFrom(remetente);
            helper.setTo(destinatario);
            helper.setSubject(email.assunto());
            helper.setText(email.texto(), email.html());
        } catch (MessagingException e) {
            throw new IllegalStateException("E-mail \"" + email.assunto() + "\" inválido", e);
        }
        mailSender.send(mensagem);
        log.info("E-mail \"{}\" enviado para {}", email.assunto(), destinatario);
    }
}
