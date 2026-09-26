import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { AvisoService } from '../util/aviso.service';
import { AuthService } from './auth.service';

/** Sem sessão válida (depois de tentar o refresh) → login voltando para a URL pedida. */
export const autenticadoGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  if (await auth.sessaoValida()) return true;
  auth.login(state.url);
  return false;
};

/**
 * canMatch do /admin: anônimo → login; logado sem ADMIN → home com aviso. O anônimo recebe a URL atual, e não
 * false: com false o router tentaria as outras rotas e mostraria "Página não encontrada" até o redirect.
 */
export const adminGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const aviso = inject(AvisoService);
  const url = router.currentNavigation()?.extractedUrl.toString() ?? '/admin';
  if (!(await auth.sessaoValida())) {
    auth.login(url);
    return router.parseUrl(router.url);
  }
  if (auth.isAdmin()) return true;
  aviso.erro('Acesso restrito à administração');
  return router.parseUrl('/');
};
