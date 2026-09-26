import { Component } from '@angular/core';

import { CATEGORIAS } from '../core/api/modelos';

@Component({
  selector: 'uz-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  readonly categorias = CATEGORIAS;
  readonly ano = new Date().getFullYear();
}
