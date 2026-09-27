package br.ifce.uzusis.common.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TratadorDeErrosTest {

    record Entrada(@NotBlank(message = "não pode ficar em branco") String nome) {
    }

    @RestController
    static class ControllerDeTeste {

        @PostMapping("/valida")
        void valida(@Valid @RequestBody Entrada entrada) {
        }

        @GetMapping("/rse")
        void rse() {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Sua sacola está vazia");
        }

        @GetMapping("/explode")
        void explode() {
            throw new IllegalStateException("segredo interno");
        }

        @GetMapping("/negado")
        void negado() {
            throw new AccessDeniedException("Access Denied");
        }

        @GetMapping("/numero")
        void numero(@RequestParam int page) {
        }
    }

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ControllerDeTeste())
            .setControllerAdvice(new TratadorDeErros())
            .build();

    @Test
    void validacao_da_400_com_erros_por_campo() throws Exception {
        mvc.perform(post("/valida").contentType(MediaType.APPLICATION_JSON).content("{\"nome\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Dados inválidos: nome: não pode ficar em branco"))
                .andExpect(jsonPath("$.erros[0].campo").value("nome"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("não pode ficar em branco"))
                .andExpect(jsonPath("$.instance").value("/valida"));
    }

    @Test
    void response_status_exception_usa_o_reason_como_detail() throws Exception {
        mvc.perform(get("/rse"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("Sua sacola está vazia"))
                .andExpect(jsonPath("$.erros").doesNotExist());
    }

    @Test
    void excecao_generica_da_500_sem_stack_nem_mensagem_interna() throws Exception {
        mvc.perform(get("/explode"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.detail").value("Erro interno. Tente novamente em instantes."))
                .andExpect(content().string(not(containsString("segredo interno"))))
                .andExpect(content().string(not(containsString("IllegalStateException"))));
    }

    @Test
    void json_ilegivel_e_parametro_com_tipo_errado_dao_400_em_pt_br() throws Exception {
        mvc.perform(post("/valida").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Corpo da requisição inválido"));
        mvc.perform(get("/numero").param("page", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Valor inválido para o parâmetro page"));
        mvc.perform(get("/numero"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Parâmetro obrigatório ausente: page"));
    }

    @Test
    void access_denied_sai_do_mvc_para_o_filtro_de_seguranca_responder() {
        // Se o handler genérico a pegasse, viraria 500 em vez do 401/403 do Spring Security.
        assertThatThrownBy(() -> mvc.perform(get("/negado")))
                .satisfies(e -> assertThat(e instanceof AccessDeniedException
                        || e.getCause() instanceof AccessDeniedException).isTrue());
    }
}
