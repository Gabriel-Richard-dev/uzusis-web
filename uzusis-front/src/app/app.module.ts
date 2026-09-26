import { registerLocaleData } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { APP_INITIALIZER, DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { OAuthModule, OAuthStorage } from 'angular-oauth2-oidc';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';
import { ApiInterceptor } from './core/interceptors/api.interceptor';
import { PaginadorPtBr } from './core/util/paginador-pt-br';
import { FooterComponent } from './layout/footer.component';
import { HeaderComponent } from './layout/header.component';
import { NaoEncontradoComponent } from './layout/nao-encontrado.component';
import { SacolaDrawerComponent } from './layout/sacola-drawer.component';
import { ShellComponent } from './layout/shell.component';
import { BaseModule } from './shared/base.module';

registerLocaleData(localePt, 'pt-BR');

// localStorage: a sessão sobrevive a outra aba (§7.5).
export function armazenamentoDaSessao(): OAuthStorage {
  return localStorage;
}

export function iniciarAutenticacao(auth: AuthService): () => Promise<void> {
  return () => auth.iniciar();
}

@NgModule({
  declarations: [
    AppComponent,
    ShellComponent,
    HeaderComponent,
    FooterComponent,
    SacolaDrawerComponent,
    NaoEncontradoComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    OAuthModule.forRoot(),
    BaseModule,
    AppRoutingModule,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    { provide: MatPaginatorIntl, useClass: PaginadorPtBr },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
    { provide: OAuthStorage, useFactory: armazenamentoDaSessao },
    { provide: APP_INITIALIZER, useFactory: iniciarAutenticacao, deps: [AuthService], multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
