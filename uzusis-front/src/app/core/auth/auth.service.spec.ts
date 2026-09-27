import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { Subject } from 'rxjs';

import { AvisoService } from '../util/aviso.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('com um login a caminho, encerrarSessaoLocal não apaga o nonce/PKCE dele', fakeAsync(() => {
    const oauth = {
      loadDiscoveryDocument: vi.fn().mockResolvedValue({}),
      initCodeFlow: vi.fn(),
      logOut: vi.fn(),
      hasValidAccessToken: vi.fn(),
      events: new Subject(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: OAuthService, useValue: oauth },
        { provide: AvisoService, useValue: {} },
      ],
    });
    const auth = TestBed.inject(AuthService);

    auth.encerrarSessaoLocal();
    expect(oauth.logOut).toHaveBeenCalledTimes(1);

    // Dois 401 juntos: o 1º inicia o login, o 2º (marca recente) pede o encerramento local.
    auth.login('/conta/pedidos');
    flushMicrotasks();
    expect(oauth.initCodeFlow).toHaveBeenCalledExactlyOnceWith('/conta/pedidos', {});
    auth.encerrarSessaoLocal();
    expect(oauth.logOut).toHaveBeenCalledTimes(1);
  }));
});
