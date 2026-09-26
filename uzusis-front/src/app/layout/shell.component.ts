import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationSkipped, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { filter } from 'rxjs';

import { CATEGORIAS } from '../core/api/modelos';
import { SacolaService } from '../core/api/sacola.service';
import { AuthService } from '../core/auth/auth.service';
import { FooterComponent } from './footer.component';
import { HeaderComponent } from './header.component';
import { SacolaDrawerComponent } from './sacola-drawer.component';

/** Layout da loja: header, conteúdo, footer, menu mobile (sheet à esquerda) e sacola (sheet à direita). */
@Component({
  selector: 'uz-shell',
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [AsyncPipe, RouterLink, RouterOutlet, HlmSheetImports, HeaderComponent, FooterComponent, SacolaDrawerComponent],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly sacola = inject(SacolaService);
  readonly usuario$ = this.auth.usuario$;
  readonly categorias = CATEGORIAS;
  readonly menuAberto = signal(false);
  readonly sacolaAberta = toSignal(this.sacola.aberta$, { initialValue: false });

  /** Link do menu mobile: 44 px, sem sublinhado. */
  readonly link =
    'flex min-h-11 w-full items-center rounded-lg px-3 text-start text-foreground no-underline hover:bg-muted hover:text-foreground';

  constructor() {
    // Um link para a URL atual ("Finalizar compra" em /checkout) não gera NavigationStart, só NavigationSkipped.
    inject(Router)
      .events.pipe(filter(e => e instanceof NavigationStart || e instanceof NavigationSkipped), takeUntilDestroyed())
      .subscribe(() => {
        this.menuAberto.set(false);
        this.sacola.fechar();
      });
  }
}
