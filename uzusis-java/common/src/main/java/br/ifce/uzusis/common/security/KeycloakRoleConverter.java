package br.ifce.uzusis.common.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * O Keycloak não põe as roles em "scope"/"authorities", que é onde o Spring
 * procura por padrão: elas ficam em realm_access.roles (papéis amplos) e
 * resource_access.&lt;client&gt;.roles (permissão fina). Sem este converter todo
 * &#64;PreAuthorize("hasRole(...)") passa a negar tudo, silenciosamente.
 */
public class KeycloakRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final JwtGrantedAuthoritiesConverter padrao = new JwtGrantedAuthoritiesConverter();

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Set<GrantedAuthority> authorities = new HashSet<>(padrao.convert(jwt));
        authorities.addAll(rolesDoRealm(jwt));
        authorities.addAll(rolesDeClients(jwt));
        // O "sub" do token é o vínculo com o perfil no identity-service.
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    private Collection<GrantedAuthority> rolesDoRealm(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        return paraAuthorities(realmAccess);
    }

    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> rolesDeClients(Jwt jwt) {
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess == null) {
            return List.of();
        }
        Set<GrantedAuthority> authorities = new HashSet<>();
        resourceAccess.values().stream()
                .filter(Map.class::isInstance)
                .forEach(client -> authorities.addAll(paraAuthorities((Map<String, Object>) client)));
        return authorities;
    }

    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> paraAuthorities(Map<String, Object> claim) {
        if (claim == null || !(claim.get("roles") instanceof Collection<?> roles)) {
            return List.of();
        }
        return ((Collection<String>) roles).stream()
                .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
                .toList();
    }
}
