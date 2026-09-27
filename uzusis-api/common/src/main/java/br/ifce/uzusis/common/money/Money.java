package br.ifce.uzusis.common.money;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Ponte entre os dois formatos de dinheiro do sistema: o banco guarda
 * NUMERIC(19,4) e o código usa BigDecimal; a Stripe e os eventos usam centavos
 * em long. A conversão fica num lugar só porque errar a escala em qualquer
 * ponta cobra do cliente 100x a mais.
 */
public final class Money {

    public static long paraCentavos(BigDecimal valor) {
        return valor.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    public static BigDecimal deCentavos(long centavos) {
        return BigDecimal.valueOf(centavos, 2);
    }

    private Money() {
    }
}
