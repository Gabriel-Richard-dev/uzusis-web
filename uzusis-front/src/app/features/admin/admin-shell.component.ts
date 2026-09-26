import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationSkipped, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { filter } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { IconeComponent } from '../../shared/icone.component';

/** Layout do /admin: menu lateral fixo a partir de lg; abaixo, o mesmo menu num sheet à esquerda. */
@Component({
  selector: 'uz-admin-shell',
  templateUrl: './admin-shell.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [AsyncPipe, NgTemplateOutlet, RouterLink, RouterLinkActive, RouterOutlet, HlmButtonImports, HlmSheetImports, IconeComponent],
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);
  readonly usuario$ = this.auth.usuario$;
  readonly menuAberto = signal(false);

  /** Link do menu: 44 px; a página atual (aria-current) fica marrom sobre areia. */
  readonly link =
    'flex h-11 w-full items-center rounded-lg px-3 text-start text-sm font-medium text-foreground no-underline hover:bg-muted hover:text-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground';

  constructor() {
    // Como no shell da loja: um link para a URL atual só gera NavigationSkipped.
    inject(Router)
      .events.pipe(filter(e => e instanceof NavigationStart || e instanceof NavigationSkipped), takeUntilDestroyed())
      .subscribe(() => this.menuAberto.set(false));
  }
}
