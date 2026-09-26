package br.ifce.uzusis.notification.notificacao;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

import java.io.ByteArrayOutputStream;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailServiceTest {

    @Test
    void envia_multipart_com_html_e_texto_do_remetente_configurado() throws Exception {
        var sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        var service = new EmailService(sender, "Uzusis <nao-responda@uzusis.local>");

        service.enviar("maria@exemplo.com",
                new EmailTemplates.Email("Pedido #17 confirmado — Uzusis", "<p>Olá, Maria!</p>", "Olá, Maria!"));

        var enviada = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(enviada.capture());
        var mensagem = enviada.getValue();
        assertThat(mensagem.getSubject()).isEqualTo("Pedido #17 confirmado — Uzusis");
        assertThat(((InternetAddress) mensagem.getFrom()[0]).getPersonal()).isEqualTo("Uzusis");
        assertThat(((InternetAddress) mensagem.getFrom()[0]).getAddress()).isEqualTo("nao-responda@uzusis.local");
        var bruto = new ByteArrayOutputStream();
        mensagem.writeTo(bruto);
        assertThat(bruto.toString())
                .contains("multipart/alternative")
                .contains("text/plain")
                .contains("text/html");
    }
}
