import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationStart, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

/** Layout do /admin: menu lateral fixo (side) a partir de $lg, gaveta (over) abaixo. */
@Component({
  selector: 'uz-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss'],
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);
  readonly usuario$ = this.auth.usuario$;
  readonly largo$ = inject(BreakpointObserver)
    .observe('(min-width: 62rem)')
    .pipe(map(r => r.matches));

  @ViewChild(MatSidenav) private menu?: MatSidenav;

  constructor() {
    inject(Router)
      .events.pipe(
        filter(e => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.menu?.mode === 'over') void this.menu.close();
      });
  }
}
