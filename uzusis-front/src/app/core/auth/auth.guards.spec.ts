import { TestBed } from '@angular/core/testing';
import { PartialMatchRouteSnapshot, Route, Router, UrlTree } from '@angular/router';

import { AvisoService } from '../util/aviso.service';
import { adminGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('adminGuard', () => {
  it('anônimo vai ao login voltando para /admin, sem cair no 404 enquanto isso', async () => {
    const auth = { sessaoValida: vi.fn().mockResolvedValue(false), login: vi.fn(), isAdmin: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AvisoService, useValue: {} },
      ],
    });

    const resultado = await TestBed.runInInjectionContext(() => adminGuard({} as Route, [], {} as PartialMatchRouteSnapshot));

    expect(auth.login).toHaveBeenCalledExactlyOnceWith('/admin');
    // false faria o router tentar as outras rotas e mostrar "Página não encontrada".
    expect(resultado instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/');
  });
});
