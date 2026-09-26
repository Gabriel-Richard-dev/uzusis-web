import { Component, EventEmitter, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CATEGORIAS } from '../core/api/modelos';
import { SacolaService } from '../core/api/sacola.service';
import { AuthService } from '../core/auth/auth.service';
import { MatIconButton, MatButton } from '@angular/material/button';
import { IconeComponent } from '../shared/icone.component';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { MatBadge } from '@angular/material/badge';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'uz-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatIconButton, IconeComponent, RouterLink, MatButton, MatMenuTrigger, FormsModule, MatBadge, MatMenu, MatMenuItem, AsyncPipe]
})
export class HeaderComponent {
  @Output() abrirMenu = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  readonly sacola = inject(SacolaService);
  readonly usuario$ = this.auth.usuario$;
  readonly quantidade$ = this.sacola.quantidade$;
  readonly categorias = CATEGORIAS;
  private readonly router = inject(Router);

  termo = '';
  buscaAberta = false;

  buscar(): void {
    const q = this.termo.trim();
    this.buscaAberta = false;
    void this.router.navigate(['/loja'], { queryParams: q ? { q } : {} });
  }
}
