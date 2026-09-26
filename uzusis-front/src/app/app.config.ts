import { registerLocaleData } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { OAuthStorage, provideOAuthClient } from 'angular-oauth2-oidc';

import { ROTAS } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { ApiInterceptor } from './core/interceptors/api.interceptor';
import { PaginadorPtBr } from './core/util/paginador-pt-br';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    // O app depende do zone.js (setTimeout, polling, Stripe); sem isto o Angular 21+ sobe zoneless.
    provideZoneChangeDetection(),
    provideRouter(ROTAS, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    provideOAuthClient(),
    // localStorage: a sessão sobrevive a outra aba (§7.5). Depois do provideOAuthClient, que traz o sessionStorage.
    { provide: OAuthStorage, useFactory: () => localStorage },
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true },
    // Nunca rejeita: sem Keycloak o app segue anônimo.
    provideAppInitializer(() => inject(AuthService).iniciar()),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    { provide: MatPaginatorIntl, useClass: PaginadorPtBr },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
  ],
};
