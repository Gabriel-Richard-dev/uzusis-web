package br.ifce.uzusis.common.money;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Conversão de dinheiro tem duas pontas (banco em NUMERIC, Stripe em centavos)
 * e errar a escala cobra 100x a mais do cliente. É teste curto porque a lógica
 * é curta — e é o tipo de código que ninguém revisa de novo.
 */
class MoneyTest {

    @Test
    void converte_ida_e_volta_sem_perder_centavo() {
        var valor = new BigDecimal("129.90");

        assertThat(Money.paraCentavos(valor)).isEqualTo(12990L);
        assertThat(Money.deCentavos(12990L)).isEqualByComparingTo(valor);
    }

    @Test
    void arredonda_a_meia_casa_para_cima_em_vez_de_truncar() {
        // NUMERIC(19,4) permite 4 casas; a Stripe só aceita centavo inteiro.
        assertThat(Money.paraCentavos(new BigDecimal("10.005"))).isEqualTo(1001L);
        assertThat(Money.paraCentavos(new BigDecimal("10.004"))).isEqualTo(1000L);
    }

    @Test
    void valor_alto_nao_estoura_e_nao_perde_precisao_como_double_perderia() {
        var valor = new BigDecimal("99999999.99");
        assertThat(Money.paraCentavos(valor)).isEqualTo(9999999999L);
    }
}
