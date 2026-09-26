package br.ifce.uzusis.notification.notificacao;

import br.ifce.uzusis.common.event.Events.EnderecoEntrega;
import br.ifce.uzusis.common.event.Events.ItemResumo;
import br.ifce.uzusis.common.event.Events.OrderCancelled;
import br.ifce.uzusis.common.event.Events.OrderPaid;
import br.ifce.uzusis.common.event.Events.OrderShipped;
import br.ifce.uzusis.common.money.Money;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Os três e-mails do pedido, em HTML (tabelas e CSS inline, que é o que os
 * clientes de e-mail entendem) e em texto. Cada um usa só o que o seu evento
 * traz. Todo valor dinâmico do HTML passa por {@link #esc}.
 */
@Component
public class EmailTemplates {

    public record Email(String assunto, String html, String texto) {
    }

    private static final Locale PT_BR = Locale.of("pt", "BR");
    private static final String RODAPE = "Uzusis — feita de irmãs para as nossas Sis.";
    private static final String P = "margin:0 0 16px;";
    private static final String TH = "padding:8px 4px;border-bottom:1px solid #e6e0da;color:#6b645e;font-weight:normal;";
    private static final String TD = "padding:8px 4px;border-bottom:1px solid #efe9e3;";

    private final String linkPedidos;

    public EmailTemplates(@Value("${uzusis.loja-url}") String lojaUrl) {
        this.linkPedidos = lojaUrl.replaceAll("/+$", "") + "/conta/pedidos";
    }

    public Email pedidoPago(OrderPaid pedido) {
        var subtotal = pedido.valorTotalCentavos() - pedido.freteCentavos();
        var html = """
                <p style="%s">Recebemos o pagamento do seu pedido <strong>#%d</strong>. Obrigada por comprar com a gente!</p>
                %s
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:0 0 16px;">
                  <tr><td style="padding:4px;color:#6b645e;">Subtotal</td><td align="right" style="padding:4px;">%s</td></tr>
                  <tr><td style="padding:4px;color:#6b645e;">Frete</td><td align="right" style="padding:4px;">%s</td></tr>
                  <tr><td style="padding:8px 4px;border-top:1px solid #e6e0da;font-weight:bold;">Total</td><td align="right" style="padding:8px 4px;border-top:1px solid #e6e0da;font-weight:bold;">%s</td></tr>
                </table>
                %s
                <p style="%s">Assim que o pedido for enviado, você recebe outro aviso.</p>
                """.formatted(P, pedido.orderId(), itensHtml(pedido.itens(), true), reais(subtotal),
                reais(pedido.freteCentavos()), reais(pedido.valorTotalCentavos()), enderecoHtml(pedido.endereco()), P);
        var texto = """
                Recebemos o pagamento do seu pedido #%d. Obrigada por comprar com a gente!

                %s
                Subtotal: %s
                Frete: %s
                Total: %s
                %s
                Assim que o pedido for enviado, você recebe outro aviso.""".formatted(pedido.orderId(),
                itensTexto(pedido.itens(), true), reais(subtotal), reais(pedido.freteCentavos()),
                reais(pedido.valorTotalCentavos()), enderecoTexto(pedido.endereco()));
        return email("Pedido #%d confirmado — Uzusis".formatted(pedido.orderId()), "Pagamento confirmado",
                pedido.clienteNome(), html, texto);
    }

    public Email pedidoEnviado(OrderShipped pedido) {
        var html = """
                <p style="%s">Boa notícia: seu pedido <strong>#%d</strong> foi enviado!</p>
                %s
                %s
                <p style="%s">Quando ele chegar, confirme o recebimento em <strong>Minha conta</strong>.</p>
                """.formatted(P, pedido.orderId(), itensHtml(pedido.itens(), false), enderecoHtml(pedido.endereco()), P);
        var texto = """
                Boa notícia: seu pedido #%d foi enviado!

                %s%s
                Quando ele chegar, confirme o recebimento em Minha conta.""".formatted(pedido.orderId(),
                itensTexto(pedido.itens(), false), enderecoTexto(pedido.endereco()));
        return email("Pedido #%d enviado — Uzusis".formatted(pedido.orderId()), "Seu pedido está a caminho",
                pedido.clienteNome(), html, texto);
    }

    /** Sem itens, endereço nem valores: o evento não traz. */
    public Email pedidoCancelado(OrderCancelled pedido) {
        var motivo = pedido.motivo() == null || pedido.motivo().isBlank() ? "não informado" : pedido.motivo();
        var estorno = "Se algum valor foi cobrado, o estorno já foi solicitado e aparece na fatura em alguns dias.";
        var sacola = "Os itens voltaram para a sua sacola. Quando quiser, é só finalizar a compra de novo.";
        var html = """
                <p style="%s">Seu pedido <strong>#%d</strong> foi cancelado.</p>
                <p style="%s"><strong>Motivo:</strong> %s</p>
                <p style="%s">%s</p>
                %s""".formatted(P, pedido.orderId(), P, esc(motivo), P, estorno,
                pedido.sacolaRestaurada() ? "<p style=\"" + P + "\">" + sacola + "</p>" : "");
        var texto = """
                Seu pedido #%d foi cancelado.

                Motivo: %s

                %s%s""".formatted(pedido.orderId(), motivo, estorno,
                pedido.sacolaRestaurada() ? "\n\n" + sacola : "");
        return email("Pedido #%d cancelado — Uzusis".formatted(pedido.orderId()), "Pedido cancelado",
                pedido.clienteNome(), html, texto);
    }

    private Email email(String assunto, String titulo, String nome, String corpoHtml, String corpoTexto) {
        var html = """
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>%s</title></head>
                <body style="margin:0;padding:0;background:#faf8f5;">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#faf8f5;">
                <tr><td align="center" style="padding:24px 12px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%%;max-width:600px;background:#ffffff;border:1px solid #e6e0da;border-radius:8px;font-family:Arial,Helvetica,sans-serif;color:#292b2e;">
                  <tr><td align="center" style="padding:28px 24px;background:#faf8f5;border-bottom:1px solid #e6e0da;border-radius:8px 8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;letter-spacing:6px;color:#7a5a41;">UZUSIS</td></tr>
                  <tr><td style="padding:32px 24px 8px;font-size:16px;line-height:1.5;">
                    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;color:#292b2e;">%s</h1>
                    <p style="%s">%s</p>
                    %s
                  </td></tr>
                  <tr><td align="center" style="padding:8px 24px 32px;">
                    <a href="%s" style="display:inline-block;padding:12px 28px;background:#7a5a41;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">Ver meus pedidos</a>
                  </td></tr>
                  <tr><td align="center" style="padding:20px 24px;background:#faf8f5;border-top:1px solid #e6e0da;border-radius:0 0 8px 8px;font-size:13px;color:#6b645e;">%s</td></tr>
                </table>
                </td></tr>
                </table>
                </body>
                </html>
                """.formatted(esc(assunto), titulo, P, esc(saudacao(nome)), corpoHtml, esc(linkPedidos), RODAPE);
        var texto = "%s\n\n%s\n\nVer meus pedidos: %s\n\n%s\n".formatted(saudacao(nome), corpoTexto, linkPedidos, RODAPE);
        return new Email(assunto, html, texto);
    }

    /** "Olá, Maria!"; "Olá!" sem nome ou quando o nome é só o e-mail. */
    private static String saudacao(String nome) {
        if (nome == null || nome.isBlank() || nome.contains("@")) {
            return "Olá!";
        }
        return "Olá, " + nome.strip().split("\\s+")[0] + "!";
    }

    private static String itensHtml(List<ItemResumo> itens, boolean comValor) {
        var linhas = lista(itens).stream()
                .map(i -> "<tr><td style=\"%s\">%s</td><td align=\"center\" style=\"%s\">%s</td><td align=\"center\" style=\"%s\">%d</td>%s</tr>"
                        .formatted(TD, esc(i.nomeProduto()), TD, esc(i.sigla()), TD, i.quantidade(),
                                comValor ? "<td align=\"right\" style=\"%s\">%s</td>".formatted(TD, reais(i.valorTotalCentavos())) : ""))
                .collect(Collectors.joining("\n"));
        return """
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:0 0 16px;">
                  <tr><th align="left" style="%s">Peça</th><th style="%s">Tamanho</th><th style="%s">Qtd.</th>%s</tr>
                %s
                </table>""".formatted(TH, TH, TH, comValor ? "<th align=\"right\" style=\"%s\">Valor</th>".formatted(TH) : "", linhas);
    }

    private static String itensTexto(List<ItemResumo> itens, boolean comValor) {
        return lista(itens).stream()
                .map(i -> "- %s (tamanho %s) x %d%s".formatted(i.nomeProduto(), i.sigla(), i.quantidade(),
                        comValor ? ": " + reais(i.valorTotalCentavos()) : ""))
                .collect(Collectors.joining("\n", "", "\n"));
    }

    private static String enderecoHtml(EnderecoEntrega endereco) {
        var linhas = linhasEndereco(endereco);
        if (linhas.isEmpty()) {
            return "";
        }
        return """
                <h2 style="margin:24px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:normal;color:#292b2e;">Endereço de entrega</h2>
                <p style="margin:0 0 16px;font-size:14px;">%s</p>""".formatted(
                linhas.stream().map(EmailTemplates::esc).collect(Collectors.joining("<br>")));
    }

    private static String enderecoTexto(EnderecoEntrega endereco) {
        var linhas = linhasEndereco(endereco);
        return linhas.isEmpty() ? "" : "\nEndereço de entrega:\n" + String.join("\n", linhas) + "\n";
    }

    private static List<String> linhasEndereco(EnderecoEntrega e) {
        if (e == null) {
            return List.of();
        }
        var linhas = new ArrayList<String>();
        linhas.add(e.destinatario());
        linhas.add(e.rua() + ", " + e.numero()
                + (e.complemento() == null || e.complemento().isBlank() ? "" : " — " + e.complemento()));
        linhas.add(e.bairro() + " — " + e.cidade() + "/" + e.uf());
        linhas.add("CEP " + e.cep());
        return linhas;
    }

    /** Evento antigo (antes dos campos novos) chega com a lista nula. */
    private static List<ItemResumo> lista(List<ItemResumo> itens) {
        return itens == null ? List.of() : itens;
    }

    /** {@code R$ 1.523,40}. O NumberFormat pt-BR põe um espaço não separável depois do R$. */
    private static String reais(long centavos) {
        return String.format(PT_BR, "R$ %,.2f", Money.deCentavos(centavos));
    }

    private static String esc(String valor) {
        return valor == null ? "" : HtmlUtils.htmlEscape(valor, "UTF-8");
    }
}
