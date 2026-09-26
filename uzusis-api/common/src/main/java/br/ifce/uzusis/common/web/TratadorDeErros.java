package br.ifce.uzusis.common.web;

import com.fasterxml.jackson.databind.JsonMappingException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Todo erro sai como ProblemDetail (RFC 7807) com {@code detail} em pt-BR,
 * que é o texto que o front mostra. O texto padrão do Spring é em inglês e às
 * vezes expõe detalhe interno, então é sempre trocado.
 */
@RestControllerAdvice
public class TratadorDeErros extends ResponseEntityExceptionHandler {

    private static final String ERRO_INTERNO = "Erro interno. Tente novamente em instantes.";

    public record Erro(String campo, String mensagem) {
    }

    /**
     * O @PreAuthorize negado lança dentro do controller. Relançar deixa o
     * ExceptionTranslationFilter responder 401/403; senão viraria 500 abaixo.
     */
    @ExceptionHandler({AccessDeniedException.class, AuthenticationException.class})
    void relancar(RuntimeException e) {
        throw e;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail conflito(DataIntegrityViolationException e) {
        logger.warn("Violação de integridade: " + e.getMostSpecificCause().getMessage());
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "A operação conflita com dados existentes.");
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail erroInterno(Exception e) {
        logger.error("Erro não tratado", e);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, ERRO_INTERNO);
    }

    /** Ponto único por onde passam as exceções do Spring MVC. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        // As ErrorResponse (ResponseStatusException incluída) chegam com body null.
        var problema = body instanceof ProblemDetail p ? p
                : ex instanceof ErrorResponse er ? er.getBody() : ProblemDetail.forStatus(status);
        var erros = erros(ex);
        if (erros != null) {
            problema.setDetail("Dados inválidos: " + erros.stream()
                    .map(e -> e.campo() + ": " + e.mensagem())
                    .collect(Collectors.joining("; ")));
            problema.setProperty("erros", erros);
        } else {
            problema.setDetail(detalhe(ex, status, problema.getDetail()));
        }
        return super.handleExceptionInternal(ex, problema, headers, status, request);
    }

    private static String detalhe(Exception ex, HttpStatusCode status, String atual) {
        if (ex instanceof ErrorResponseException && atual != null) {
            return atual; // ResponseStatusException: o reason já é o texto certo
        }
        if (ex instanceof HttpMessageNotReadableException) {
            var caminho = ex.getCause() instanceof JsonMappingException jme ? caminho(jme) : "";
            return caminho.isEmpty() ? "Corpo da requisição inválido" : "Valor inválido para o campo " + caminho;
        }
        if (ex instanceof TypeMismatchException tme) {
            return "Valor inválido para o parâmetro " + tme.getPropertyName();
        }
        if (ex instanceof MissingServletRequestParameterException e) {
            return "Parâmetro obrigatório ausente: " + e.getParameterName();
        }
        if (ex instanceof MissingServletRequestPartException e) {
            return "Parâmetro obrigatório ausente: " + e.getRequestPartName();
        }
        if (ex instanceof MissingRequestHeaderException e) {
            return "Parâmetro obrigatório ausente: " + e.getHeaderName();
        }
        if (ex instanceof MaxUploadSizeExceededException) {
            return "Arquivo maior que 5 MB.";
        }
        return switch (status.value()) {
            case 400 -> "Requisição inválida.";
            case 404 -> "Recurso não encontrado.";
            case 405 -> "Método não permitido.";
            case 406 -> "Formato de resposta não suportado.";
            case 415 -> "Tipo de conteúdo não suportado.";
            case 503 -> "Serviço indisponível. Tente novamente em instantes.";
            default -> status.is5xxServerError() ? ERRO_INTERNO : "Requisição inválida.";
        };
    }

    /** Erros de Bean Validation, ou null se a exceção não for de validação. */
    private static List<Erro> erros(Exception ex) {
        if (ex instanceof MethodArgumentNotValidException e) {
            return e.getAllErrors().stream()
                    .map(erro -> new Erro(erro instanceof FieldError f ? f.getField() : erro.getObjectName(),
                            erro.getDefaultMessage()))
                    .toList();
        }
        if (ex instanceof HandlerMethodValidationException e) {
            var erros = new ArrayList<Erro>();
            e.getAllValidationResults().forEach(resultado -> resultado.getResolvableErrors().forEach(erro ->
                    erros.add(new Erro(erro instanceof FieldError f ? f.getField()
                            : resultado.getMethodParameter().getParameterName(), erro.getDefaultMessage()))));
            return erros;
        }
        return null;
    }

    /** {@code endereco.uf}, {@code itens[0].sigla}. */
    private static String caminho(JsonMappingException e) {
        var caminho = new StringBuilder();
        for (var ref : e.getPath()) {
            if (ref.getFieldName() != null) {
                caminho.append(caminho.isEmpty() ? "" : ".").append(ref.getFieldName());
            } else if (ref.getIndex() >= 0) {
                caminho.append('[').append(ref.getIndex()).append(']');
            }
        }
        return caminho.toString();
    }
}
