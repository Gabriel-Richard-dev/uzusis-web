package br.ifce.uzusis.notification.notificacao;

import br.ifce.uzusis.common.event.Events.EnderecoEntrega;
import br.ifce.uzusis.common.event.Events.ItemResumo;
import br.ifce.uzusis.common.event.Events.OrderCancelled;
import br.ifce.uzusis.common.event.Events.OrderPaid;
import br.ifce.uzusis.common.event.Events.OrderShipped;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class EmailTemplatesTest {

    private final EmailTemplates templates = new EmailTemplates("http://localhost:8088/");

    private static final EnderecoEntrega ENDERECO = new EnderecoEntrega("Maria Souza", "85999990000", "60000-000",
            "Rua A", "10", "Apto 101", "Centro", "Fortaleza", "CE");
    private static final List<ItemResumo> ITENS = List.of(
            new ItemResumo("Blusa <b>Linho</b>", "P", 2, 17980),
            new ItemResumo("Saia Midi", "M", 1, 12000));

    @Test
    void pago_escapa_o_nome_e_mostra_itens_totais_endereco_e_link() {
        var email = templates.pedidoPago(new OrderPaid(17, "sub", "maria@exemplo.com",
                "<script>alert(1)</script> Souza", 30980, 1000, ITENS, ENDERECO));

        assertThat(email.assunto()).isEqualTo("Pedido #17 confirmado — Uzusis");
        assertThat(email.html())
                .contains("Olá, &lt;script&gt;alert(1)&lt;/script&gt;!")
                .doesNotContain("<script>")
                .contains("Blusa &lt;b&gt;Linho&lt;/b&gt;")
                .contains("R$ 179,80", "R$ 120,00")
                .contains("R$ 299,80") // subtotal = total − frete
                .contains("R$ 10,00")
                .contains("R$ 309,80")
                .contains("Rua A, 10 — Apto 101", "Centro — Fortaleza/CE", "CEP 60000-000")
                .contains("href=\"http://localhost:8088/conta/pedidos\"")
                .contains("UZUSIS", "Georgia", "#7a5a41", "#faf8f5")
                .contains("Uzusis — feita de irmãs para as nossas Sis.");
        assertThat(email.texto())
                .contains("Total: R$ 309,80")
                .contains("Ver meus pedidos: http://localhost:8088/conta/pedidos");
    }

    @Test
    void total_do_e2e_formatado_em_reais() {
        var email = templates.pedidoPago(new OrderPaid(1, "sub", "m@e.com", "Maria", 18980, 1000,
                List.of(new ItemResumo("Blusa", "P", 2, 17980)), ENDERECO));

        assertThat(email.html()).contains("R$ 189,80").contains("Olá, Maria!");
    }

    @Test
    void enviado_tem_itens_e_endereco_sem_valores() {
        var email = templates.pedidoEnviado(new OrderShipped(19, "sub", "maria@exemplo.com", "Maria Souza",
                ITENS, ENDERECO));

        assertThat(email.assunto()).isEqualTo("Pedido #19 enviado — Uzusis");
        assertThat(email.html())
                .contains("Olá, Maria!")
                .contains("Blusa &lt;b&gt;Linho&lt;/b&gt;", "Saia Midi")
                .contains("Fortaleza/CE")
                .contains("confirme o recebimento em <strong>Minha conta</strong>")
                .contains("/conta/pedidos")
                .doesNotContain("R$");
        assertThat(email.texto()).doesNotContain("R$");
    }

    @Test
    void cancelado_nao_tem_valores_e_so_fala_da_sacola_quando_restaurada() {
        var restaurada = templates.pedidoCancelado(new OrderCancelled(18, "sub", "maria@exemplo.com", "Maria Souza",
                "Pagamento recusado", true));
        var semSacola = templates.pedidoCancelado(new OrderCancelled(18, "sub", "maria@exemplo.com", null,
                "Sem estoque: Blusa <Linho> (M)", false));

        assertThat(restaurada.assunto()).isEqualTo("Pedido #18 cancelado — Uzusis");
        assertThat(restaurada.html())
                .contains("Pagamento recusado")
                .contains("o estorno já foi solicitado")
                .contains("Os itens voltaram para a sua sacola")
                .contains("/conta/pedidos")
                .doesNotContain("R$", "Endereço de entrega");
        assertThat(restaurada.texto()).contains("Os itens voltaram para a sua sacola");

        assertThat(semSacola.html())
                .contains("Olá!")
                .contains("Sem estoque: Blusa &lt;Linho&gt; (M)")
                .doesNotContain("Os itens voltaram para a sua sacola")
                .doesNotContain("R$");
        assertThat(semSacola.texto()).doesNotContain("Os itens voltaram para a sua sacola");
    }

    @Test
    void nome_que_e_so_o_email_nao_vira_saudacao() {
        var email = templates.pedidoCancelado(new OrderCancelled(1, "sub", "m@e.com", "m@e.com", "x", false));

        assertThat(email.html()).contains("Olá!").doesNotContain("Olá, m@e.com");
    }

    @Test
    void evento_sem_os_campos_novos_nao_quebra() {
        var email = templates.pedidoPago(new OrderPaid(2, "sub", "m@e.com", null, 5000, 0, null, null));

        assertThat(email.html()).contains("R$ 50,00").doesNotContain("Endereço de entrega");
    }
}
