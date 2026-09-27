import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

const MARCA_LOGIN = 'uz-login-por-401';

/** Bearer só em /api com token válido; 401 tratado conforme §7.5. ViaCEP e Stripe nunca recebem token. */
@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith('/api/')) return next.handle(req);
    const token = this.auth.tokenValido();
    // Sem token: um 401 só é repassado; anônimo nunca é jogado no Keycloak.
    if (!token) return next.handle(req);

    return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
        // Assinatura que deixou de valer (realm reimportado): a rota pública funciona sem token.
        if (req.method === 'GET' && ehGetPublico(req.url)) {
          this.auth.encerrarSessaoLocal();
          return next.handle(req);
        }
        // No máximo um login a cada 60 s: evita o laço login → 401 → login quando o iss diverge.
        if (Date.now() - ultimoLogin() > 60_000) {
          marcarLogin();
          this.auth.login(this.router.url);
        } else {
          this.auth.encerrarSessaoLocal();
        }
        return throwError(() => err);
      }),
    );
  }
}

function ehGetPublico(url: string): boolean {
  return (url.startsWith('/api/produtos') && !url.startsWith('/api/produtos/admin'))
    || url.startsWith('/api/pagamentos/config');
}

// sessionStorage sobrevive ao redirect para o Keycloak e volta.
function ultimoLogin(): number {
  try {
    return Number(sessionStorage.getItem(MARCA_LOGIN)) || 0;
  } catch {
    return 0;
  }
}

function marcarLogin(): void {
  try {
    sessionStorage.setItem(MARCA_LOGIN, String(Date.now()));
  } catch {
    // sem storage: segue sem a trava
  }
}
