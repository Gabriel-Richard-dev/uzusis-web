package br.ifce.uzusis.identity.perfil;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Aceita {@code 12345678909} ou {@code 123.456.789-09} e confere os dígitos verificadores. */
public class CpfValidator implements ConstraintValidator<CpfValidator.Cpf, String> {

    @Target(ElementType.FIELD)
    @Retention(RetentionPolicy.RUNTIME)
    @Constraint(validatedBy = CpfValidator.class)
    public @interface Cpf {
        String message() default "CPF inválido";

        Class<?>[] groups() default {};

        Class<? extends Payload>[] payload() default {};
    }

    @Override
    public boolean isValid(String cpf, ConstraintValidatorContext contexto) {
        return cpf == null || valido(cpf);
    }

    static boolean valido(String cpf) {
        if (!cpf.matches("\\d{11}|\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}")) {
            return false;
        }
        var d = cpf.replaceAll("\\D", "");
        // 111.111.111-11 e afins passam na conta, mas não são CPF.
        if (d.chars().distinct().count() == 1) {
            return false;
        }
        return digito(d, 9) == d.charAt(9) - '0' && digito(d, 10) == d.charAt(10) - '0';
    }

    /** Dígito verificador na posição {@code n}, a partir dos {@code n} dígitos anteriores. */
    private static int digito(String d, int n) {
        var soma = 0;
        for (var i = 0; i < n; i++) {
            soma += (d.charAt(i) - '0') * (n + 1 - i);
        }
        var resto = soma * 10 % 11;
        return resto == 10 ? 0 : resto;
    }
}
