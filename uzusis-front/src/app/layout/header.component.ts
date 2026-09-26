import { Component, EventEmitter, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CATEGORIAS } from '../core/api/modelos';
import { SacolaService } from '../core/api/sacola.service';
import { AuthService } from '../core/auth/auth.service';
import { IconeComponent } from '../shared/icone.component';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

@Component({
    selector: 'uz-header',
    templateUrl: './header.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
      IconeComponent,
      RouterLink,
      FormsModule,
      AsyncPipe,
      HlmBadgeImports,
      HlmButtonImports,
      HlmDropdownMenuImports,
      HlmInputGroupImports,
    ]
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
