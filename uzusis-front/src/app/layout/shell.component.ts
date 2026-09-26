import { Component, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationSkipped, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

import { SacolaService } from '../core/api/sacola.service';
import { CATEGORIAS } from '../core/api/modelos';
import { AuthService } from '../core/auth/auth.service';

/** Layout da loja: header, conteúdo, footer, menu mobile (sidenav start) e sacola (sidenav end). */
@Component({
  selector: 'uz-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
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
