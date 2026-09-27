import { Component, ChangeDetectionStrategy } from '@angular/core';

import { CATEGORIAS } from '../core/api/modelos';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'uz-footer',
    templateUrl: './footer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterLink]
})
export class FooterComponent {
  readonly categorias = CATEGORIAS;
  readonly ano = new Date().getFullYear();
  /** Links do rodapé: 44 px de alvo, tinta com hover marrom. */
  readonly link = 'inline-flex min-h-11 items-center text-foreground no-underline hover:text-brand-hover hover:underline';
}
