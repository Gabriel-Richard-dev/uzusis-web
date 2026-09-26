import { Component, EventEmitter, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CATEGORIAS } from '../core/api/modelos';
import { SacolaService } from '../core/api/sacola.service';
import { AuthService } from '../core/auth/auth.service';
import { IconeComponent } from '../shared/icone.component';
import { AsyncPipe } from '@angular/common';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { BuscaComponent } from './busca.component';

@Component({
    selector: 'uz-header',
    templateUrl: './header.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
      IconeComponent,
      RouterLink,
      AsyncPipe,
      HlmBadgeImports,
      HlmButtonImports,
      HlmDropdownMenuImports,
      BuscaComponent,
    ]
})
export class HeaderComponent {
  @Output() abrirMenu = new EventEmitter<void>();
  /** Celular: o shell abre a busca em tela cheia. */
  @Output() abrirBusca = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  readonly sacola = inject(SacolaService);
  readonly usuario$ = this.auth.usuario$;
  readonly quantidade$ = this.sacola.quantidade$;
  readonly categorias = CATEGORIAS;
}
