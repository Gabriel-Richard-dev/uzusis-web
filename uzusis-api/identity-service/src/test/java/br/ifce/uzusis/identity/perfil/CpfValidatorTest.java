package br.ifce.uzusis.identity.perfil;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CpfValidatorTest {

    @Test
    void aceita_cpf_valido_com_e_sem_mascara() {
        // no 123.456.789-09 o primeiro dígito dá resto 10, que vira 0
        assertThat(CpfValidator.valido("123.456.789-09")).isTrue();
        assertThat(CpfValidator.valido("12345678909")).isTrue();
        assertThat(CpfValidator.valido("529.982.247-25")).isTrue();
        assertThat(CpfValidator.valido("00000000191")).isTrue();
    }

    @Test
    void recusa_digito_verificador_errado() {
        assertThat(CpfValidator.valido("123.456.789-00")).isFalse();
        assertThat(CpfValidator.valido("12345678919")).isFalse();
        assertThat(CpfValidator.valido("52998224726")).isFalse();
    }

    @Test
    void recusa_digitos_repetidos_e_formato_errado() {
        assertThat(CpfValidator.valido("111.111.111-11")).isFalse();
        assertThat(CpfValidator.valido("00000000000")).isFalse();
        assertThat(CpfValidator.valido("1234567890")).isFalse();
        assertThat(CpfValidator.valido("123456789-09")).isFalse();
        assertThat(CpfValidator.valido("123.456.789-0a")).isFalse();
        assertThat(CpfValidator.valido("")).isFalse();
    }

    @Test
    void nulo_e_valido_porque_null_mantem_o_valor() {
        assertThat(new CpfValidator().isValid(null, null)).isTrue();
    }
}
