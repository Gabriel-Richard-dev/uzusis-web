package br.ifce.uzusis.catalog.produto;

import br.ifce.uzusis.catalog.PostgresDeTeste;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Com o yml, o SecurityConfig e o TratadorDeErros reais: a negação do
 * @PreAuthorize tem de chegar como 401/403, nunca como 500.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresDeTeste.class)
class ProdutoControllerSecurityTest {

    private static final String PRODUTO = """
            {"nome":"Blusa Linho","preco":89.90,"descricao":"Blusa de linho.","categoria":"BLUSA",
             "tamanhos":[{"sigla":"p","quantidade":3}]}""";

    @Autowired
    MockMvc mvc;

    private static RequestPostProcessor comPapel(String papel) {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_" + papel));
    }

    @Test
    void anonimo_na_lista_do_admin_recebe_401() throws Exception {
        mvc.perform(get("/produtos/admin")).andExpect(status().isUnauthorized());
    }

    @Test
    void cliente_criando_produto_recebe_403() throws Exception {
        mvc.perform(post("/produtos").with(comPapel("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON).content(PRODUTO))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_com_nome_vazio_recebe_400_com_detail_em_portugues() throws Exception {
        mvc.perform(post("/produtos").with(comPapel("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(PRODUTO.replace("\"Blusa Linho\"", "\"\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Dados inválidos: nome: nome é obrigatório"))
                .andExpect(jsonPath("$.erros[0].campo").value("nome"));
    }

    @Test
    void produto_excluido_some_para_o_anonimo_e_segue_visivel_ao_admin() throws Exception {
        var criado = mvc.perform(post("/produtos").with(comPapel("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON).content(PRODUTO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categoriaNome").value("Blusa"))
                .andExpect(jsonPath("$.tamanhos[0].sigla").value("P"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(criado, "$.id");

        mvc.perform(delete("/produtos/{id}", id).with(comPapel("ADMIN"))).andExpect(status().isNoContent());
        mvc.perform(delete("/produtos/{id}", id).with(comPapel("ADMIN"))).andExpect(status().isNoContent());

        mvc.perform(get("/produtos/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Produto não encontrado"));
        mvc.perform(get("/produtos/{id}", id).with(comPapel("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));
    }

    @Test
    void upload_sem_a_parte_arquivo_recebe_400_com_o_texto_do_contrato() throws Exception {
        mvc.perform(post("/produtos/1/fotos").with(comPapel("ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Envie o arquivo no campo 'arquivo'."));
    }

    @Test
    void vitrine_com_ordenacao_fora_da_lista_recebe_400() throws Exception {
        mvc.perform(get("/produtos").param("sort", "descricao,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ordenação inválida"));
        mvc.perform(get("/produtos").param("categoria", "VESTIDO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", startsWith("Valor inválido para o parâmetro")));
    }
}
