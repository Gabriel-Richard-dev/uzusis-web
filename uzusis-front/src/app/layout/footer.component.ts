import { Component, ChangeDetectionStrategy } from '@angular/core';

import { CATEGORIAS } from '../core/api/modelos';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'uz-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterLink]
})
export class FooterComponent {
  readonly categorias = CATEGORIAS;
  readonly ano = new Date().getFullYear();
}
