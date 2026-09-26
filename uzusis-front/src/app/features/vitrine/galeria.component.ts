import { Component, Input } from '@angular/core';

import { FotoResposta } from '../../core/api/modelos';

/**
 * Fotos do produto. Os dois layouts ficam no DOM e o CSS mostra um: miniaturas + principal a partir de $md,
 * faixa com scroll-snap e indicadores no mobile. O escondido (display: none) sai da ordem de foco e do leitor.
 */
@Component({
  selector: 'uz-galeria',
  templateUrl: './galeria.component.html',
  styleUrls: ['./galeria.component.scss'],
})
export class GaleriaComponent {
  @Input({ required: true }) nome!: string;

  @Input({ required: true })
  set fotos(fotos: FotoResposta[]) {
    this._fotos = fotos;
    this.atual = 0;
  }
  get fotos(): FotoResposta[] {
    return this._fotos;
  }
  private _fotos: FotoResposta[] = [];

  atual = 0;

  alt(i: number): string {
    return `${this.nome} — foto ${i + 1} de ${this.fotos.length}`;
  }

  aoRolar(faixa: HTMLElement): void {
    this.atual = Math.round(faixa.scrollLeft / faixa.clientWidth);
  }
}
