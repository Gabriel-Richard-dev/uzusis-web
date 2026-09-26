package br.ifce.uzusis.order.pedido;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FreteServiceTest {

    private final FreteService frete = new FreteService(new BigDecimal("40"), "CE=10.00, sp=25.5");

    @Test
    void usa_o_valor_da_uf_ou_o_padrao() {
        assertThat(frete.valor("CE")).isEqualTo(new BigDecimal("10.00"));
        assertThat(frete.valor("ce")).isEqualTo(new BigDecimal("10.00"));
        assertThat(frete.valor("SP")).isEqualTo(new BigDecimal("25.50"));
        assertThat(frete.valor("RJ")).isEqualTo(new BigDecimal("40.00"));
    }

    @Test
    void uf_invalida_e_400() {
        assertThatThrownBy(() -> frete.valor("XX"))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode().value()).isEqualTo(400);
                    assertThat(e.getReason()).isEqualTo("UF inválida");
                });
        assertThatThrownBy(() -> frete.valor(null)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void configuracao_vazia_usa_so_o_padrao_e_errada_nao_sobe() {
        assertThat(new FreteService(new BigDecimal("40.00"), "").valor("CE")).isEqualTo(new BigDecimal("40.00"));
        assertThatThrownBy(() -> new FreteService(BigDecimal.TEN, "CE10")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FreteService(BigDecimal.TEN, "XX=5")).isInstanceOf(IllegalArgumentException.class);
    }
}
