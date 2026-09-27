import { AuthConfig } from 'angular-oauth2-oidc';

import { environment } from '../../../environments/environment';

/** Authorization Code + PKCE com o client público web-app do Keycloak (§7.5). */
export function criarAuthConfig(): AuthConfig {
  return {
    issuer: environment.issuer ?? location.origin + '/auth/realms/uzusis',
    clientId: 'web-app',
    responseType: 'code',
    scope: 'openid profile email',
    redirectUri: location.origin + '/',
    postLogoutRedirectUri: location.origin + '/',
    requireHttps: false, // TLS é do proxy de borda
    sessionChecksEnabled: false,
    clearHashAfterLogin: true,
    showDebugInformation: false,
  };
}
