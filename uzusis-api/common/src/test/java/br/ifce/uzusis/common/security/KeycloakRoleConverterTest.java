package br.ifce.uzusis.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class KeycloakRoleConverterTest {

    private final KeycloakRoleConverter converter = new KeycloakRoleConverter();

    @Test
    void papel_do_realm_vira_role_e_papel_de_client_nao() {
        var jwt = Jwt.withTokenValue("t")
                .header("alg", "none")
                .subject("c0a8-sub")
                .claim("realm_access", Map.of("roles", List.of("CUSTOMER")))
                .claim("resource_access", Map.of("qualquer-client", Map.of("roles", List.of("ADMIN"))))
                .build();

        var token = converter.convert(jwt);

        assertThat(token.getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .contains("ROLE_CUSTOMER")
                .doesNotContain("ROLE_ADMIN");
        assertThat(token.getName()).isEqualTo("c0a8-sub");
    }

    @Test
    void admin_do_realm_gera_role_admin() {
        var jwt = Jwt.withTokenValue("t")
                .header("alg", "none")
                .subject("admin-sub")
                .claim("realm_access", Map.of("roles", List.of("ADMIN")))
                .build();

        assertThat(converter.convert(jwt).getAuthorities()).extracting(GrantedAuthority::getAuthority)
                .contains("ROLE_ADMIN");
    }
}
