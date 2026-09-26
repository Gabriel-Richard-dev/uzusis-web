import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

import { AvisoService } from '../util/aviso.service';
import { criarAuthConfig } from './auth.config';
import { extrairRoles } from './roles';

export interface Usuario {
  /** Nome da conta (claim name, senão preferred_username, senão e-mail). */
  nome: string;
  email: string;
  /** realm_access.roles do access token: 'ADMIN', 'CUSTOMER'… */
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oauth = inject(OAuthService);
  private readonly router = inject(Router);
  private readonly aviso = inject(AvisoService);
  private readonly usuarioSubj = new BehaviorSubject<Usuario | null>(null);
  private descobertaCarregada = false;
  /** Um login já saiu para o Keycloak; a página vai ser trocada. */
  private redirecionando = false;

  /** null = anônimo. */
  readonly usuario$ = this.usuarioSubj.asObservable();
  readonly logado$ = this.usuario$.pipe(map(u => u !== null), distinctUntilChanged());

  constructor() {
    this.oauth.events.subscribe(() => this.atualizar());
  }

  /** APP_INITIALIZER. Nunca rejeita: sem Keycloak (fora ou subindo) o app segue anônimo. */
  async iniciar(): Promise<void> {
    this.oauth.configure(criarAuthConfig());
    this.oauth.setupAutomaticSilentRefresh();
    try {
      await this.oauth.loadDiscoveryDocumentAndTryLogin();
      this.descobertaCarregada = true;
      // A lib só agenda refresh de token ainda válido; quem volta depois de 15 min pareceria deslogado.
      if (!this.oauth.hasValidAccessToken() && this.oauth.getRefreshToken()) {
        await this.oauth.refreshToken().catch(() => this.oauth.logOut(true));
      }
      this.voltarParaOrigem();
    } catch (e) {
      console.warn('Login indisponível; seguindo anônimo.', e);
    }
    this.atualizar();
  }

  get logado(): boolean {
    return this.oauth.hasValidAccessToken();
  }

  /** Access token só se ainda válido (token vencido em rota pública daria 401). */
  tokenValido(): string | null {
    return this.oauth.hasValidAccessToken() ? this.oauth.getAccessToken() : null;
  }

  isAdmin(): boolean {
    return extrairRoles(this.tokenValido()).includes('ADMIN');
  }

  /** Sessão válida, tentando o refresh token se o access token venceu. */
  async sessaoValida(): Promise<boolean> {
    if (this.oauth.hasValidAccessToken()) return true;
    if (!this.oauth.getRefreshToken()) return false;
    try {
      await this.oauth.refreshToken();
    } catch {
      return false;
    }
    return this.oauth.hasValidAccessToken();
  }

  /** Vai ao Keycloak e volta para returnUrl (padrão: a página atual). */
  login(returnUrl: string = this.router.url): void {
    void this.iniciarFluxo(returnUrl);
  }

  /** Tela de cadastro do Keycloak; se ele ignorar prompt=create, cai no login, que tem "Cadastre-se". */
  cadastrar(): void {
    void this.iniciarFluxo('/', { prompt: 'create' });
  }

  alterarSenha(): void {
    void this.iniciarFluxo(this.router.url, { kc_action: 'UPDATE_PASSWORD' });
  }

  /** Encerra a sessão no Keycloak (id_token_hint) e volta para a home. */
  logout(): void {
    this.oauth.logOut();
  }

  /**
   * Apaga os tokens locais, sem ir ao Keycloak. Com um login a caminho não faz nada: o logOut(true) apagaria
   * também o nonce e o PKCE_verifier dele, e a volta do Keycloak falharia (dois 401 juntos no interceptor).
   */
  encerrarSessaoLocal(): void {
    if (!this.redirecionando) this.oauth.logOut(true);
  }

  private async iniciarFluxo(retorno: string, params: object = {}): Promise<void> {
    if (!this.descobertaCarregada) {
      try {
        await this.oauth.loadDiscoveryDocument();
        this.descobertaCarregada = true;
      } catch {
        this.aviso.erro('Login indisponível, tente em instantes');
        return;
      }
    }
    this.redirecionando = true;
    this.oauth.initCodeFlow(retorno, params);
  }

  /** O state volta do Keycloak pela URL: só aceita caminho interno. Roda antes da navegação inicial do router. */
  private voltarParaOrigem(): void {
    const destino = this.oauth.state ? decodeURIComponent(this.oauth.state) : '';
    if (destino.startsWith('/') && !destino.startsWith('//') && !destino.startsWith('/\\')) {
      history.replaceState(null, '', destino);
    }
  }

  private atualizar(): void {
    if (!this.oauth.hasValidAccessToken()) {
      if (this.usuarioSubj.value) this.usuarioSubj.next(null);
      return;
    }
    const claims = (this.oauth.getIdentityClaims() ?? {}) as Record<string, unknown>;
    const texto = (v: unknown) => (typeof v === 'string' ? v : '');
    const email = texto(claims['email']);
    this.usuarioSubj.next({
      nome: texto(claims['name']) || texto(claims['preferred_username']) || email,
      email,
      roles: extrairRoles(this.oauth.getAccessToken()),
    });
  }
}
