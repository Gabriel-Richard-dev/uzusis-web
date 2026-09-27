package br.ifce.uzusis.order.pedido;

import br.ifce.uzusis.order.PostgresDeTeste;
import br.ifce.uzusis.order.catalogo.CatalogoClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contexto real (yml, SecurityConfig, TratadorDeErros) com o JWT simulado:
 * negação vira 401/403 e nunca 500, e o pedido de outra pessoa é 404.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresDeTeste.class)
class PedidoControllerSecurityTest {

    @MockBean
    CatalogoClient catalogo;
    @Autowired
    MockMvc mvc;
    @Autowired
    PedidoRepository pedidos;
    @Autowired
    JwtDecoder decodificador;
    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    String emissor;

    private static JwtRequestPostProcessor cliente(String sub) {
        return jwt().jwt(token -> token.subject(sub).claim("email", sub + "@exemplo.com"))
                .authorities(new SimpleGrantedAuthority("ROLE_CUSTOMER"));
    }

    private static JwtRequestPostProcessor admin() {
        return jwt().jwt(token -> token.subject("admin")).authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    void anonimo_recebe_401() throws Exception {
        mvc.perform(get("/pedidos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/pedidos/admin")).andExpect(status().isUnauthorized());
    }

    @Test
    void cliente_nas_rotas_de_admin_recebe_403_e_nao_500() throws Exception {
        mvc.perform(get("/pedidos/admin").with(cliente("c1"))).andExpect(status().isForbidden());
        mvc.perform(get("/pedidos/admin/resumo").with(cliente("c1"))).andExpect(status().isForbidden());
        mvc.perform(post("/pedidos/1/enviar").with(cliente("c1"))).andExpect(status().isForbidden());
    }

    /**
     * O validador de verdade do decoder que o Boot montou, com o SoAccessToken
     * do common: sem o Keycloak não há como assinar, então a assinatura fica de fora.
     */
    @Test
    @SuppressWarnings("unchecked")
    void id_token_do_keycloak_nao_vale_como_access_token() {
        var validador = (OAuth2TokenValidator<Jwt>) ReflectionTestUtils.getField(decodificador, "jwtValidator");

        assertThat(validador.validate(token("ID")).hasErrors()).isTrue();
        assertThat(validador.validate(token("Bearer")).hasErrors()).isFalse();
    }

    private Jwt token(String typ) {
        return Jwt.withTokenValue("t").header("alg", "RS256").issuer(emissor).subject("sub-1").claim("typ", typ)
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
    }

    @Test
    void pedido_de_outro_cliente_da_404() throws Exception {
        var dono = "dono-" + UUID.randomUUID();
        var endereco = new EnderecoEntrega("Dono", null, "60000-000", "Rua A", "10", null, "Centro", "Fortaleza", "CE");
        long id = pedidos.save(new Pedido(dono, dono + "@exemplo.com", "Dono", endereco, new BigDecimal("10.00"))).getId();

        mvc.perform(get("/pedidos/{id}", id).with(cliente("intruso")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Pedido não encontrado"));
        mvc.perform(post("/pedidos/{id}/receber", id).with(cliente("intruso"))).andExpect(status().isNotFound());

        mvc.perform(get("/pedidos/{id}", id).with(cliente(dono)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CRIADO"))
                .andExpect(jsonPath("$.frete").value(10.0))
                .andExpect(jsonPath("$.endereco.uf").value("CE"))
                .andExpect(jsonPath("$.expiraEm").isNotEmpty());
        mvc.perform(get("/pedidos/{id}", id).with(admin())).andExpect(status().isOk());
    }

    @Test
    void endereco_invalido_da_400_com_detalhe_em_portugues() throws Exception {
        mvc.perform(post("/pedidos").with(cliente("c2")).contentType(APPLICATION_JSON).content("""
                        {"endereco":{"destinatario":"Maria","cep":"60000-000","rua":"Rua A","numero":"10",
                                     "bairro":"Centro","cidade":"Fortaleza","uf":"XX"}}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Dados inválidos: endereco.uf: UF inválida"))
                .andExpect(jsonPath("$.erros[0].campo").value("endereco.uf"));
    }

    @Test
    void frete_vem_do_servidor() throws Exception {
        mvc.perform(get("/pedidos/frete").param("uf", "ce").with(cliente("c3")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uf").value("CE"))
                .andExpect(jsonPath("$.valor").value(10.0));
        mvc.perform(get("/pedidos/frete").param("uf", "XX").with(cliente("c3")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("UF inválida"));
    }

    @Test
    void lista_do_admin_so_aceita_status_e_ordenacao_permitidos() throws Exception {
        mvc.perform(get("/pedidos/admin").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.size").value(20));
        mvc.perform(get("/pedidos/admin").param("status", "PAGO", "CANCELADO").with(admin()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Status não permitido nesta lista"));
        mvc.perform(get("/pedidos/admin").param("sort", "valorTotal,desc").with(admin()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ordenação inválida"));
        mvc.perform(get("/pedidos/admin/resumo").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.porStatus.CRIADO").isNumber())
                .andExpect(jsonPath("$.porStatus.CANCELADO").isNumber())
                .andExpect(jsonPath("$.receitaMes").isNumber());
    }
}
