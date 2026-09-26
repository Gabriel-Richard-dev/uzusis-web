import { Component, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { NavigationSkipped, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { SacolaService } from '../core/api/sacola.service';
import { CATEGORIAS } from '../core/api/modelos';
import { AuthService } from '../core/auth/auth.service';
import { MatIconButton } from '@angular/material/button';
import { IconeComponent } from '../shared/icone.component';
import { SacolaDrawerComponent } from './sacola-drawer.component';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';
import { AsyncPipe } from '@angular/common';

/** Layout da loja: header, conteúdo, footer, menu mobile (sidenav start) e sacola (sidenav end). */
@Component({
    selector: 'uz-shell',
    templateUrl: './shell.component.html',
    styleUrls: ['./shell.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatSidenavContainer, MatSidenav, MatIconButton, IconeComponent, RouterLink, SacolaDrawerComponent, MatSidenavContent, HeaderComponent, RouterOutlet, FooterComponent, AsyncPipe]
})
export class ShellComponent {
  @ViewChild('menu') menu?: MatSidenav;

  readonly auth = inject(AuthService);
  readonly sacola = inject(SacolaService);
  readonly usuario$ = this.auth.usuario$;
  readonly categorias = CATEGORIAS;

  constructor() {
    // Um link para a URL atual ("Finalizar compra" em /checkout) não gera NavigationStart, só NavigationSkipped.
    inject(Router)
      .events.pipe(filter(e => e instanceof NavigationStart || e instanceof NavigationSkipped), takeUntilDestroyed())
      .subscribe(() => {
        this.menu?.close();
        this.sacola.fechar();
      });
  }

  sacolaMudou(aberta: boolean): void {
    if (!aberta) this.sacola.fechar();
  }
}
