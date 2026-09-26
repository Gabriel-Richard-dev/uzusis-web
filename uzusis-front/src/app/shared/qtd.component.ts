import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Seletor de quantidade controlado: só emite (valorChange); quem usa atualiza [valor].
 * Use [(valor)] para estado local, ou [valor] + (valorChange) quando a mudança depende do servidor.
 */
@Component({
  selector: 'uz-qtd',
  template: `
    <div class="qtd" role="group" [attr.aria-label]="rotulo">
      <button
        mat-icon-button
        type="button"
        [disabled]="desabilitado || valor <= min"
        [attr.aria-label]="'Diminuir ' + rotulo.toLowerCase()"
        (click)="mudar(valor - 1)"
      >
        <uz-icone nome="menos" [tamanho]="18"></uz-icone>
      </button>
      <input
        #entrada
        class="qtd__entrada"
        type="number"
        inputmode="numeric"
        [min]="min"
        [max]="max"
        [value]="valor"
        [disabled]="desabilitado"
        [attr.aria-label]="rotulo"
        (change)="mudar(entrada.valueAsNumber); entrada.value = '' + valor"
      />
      <button
        mat-icon-button
        type="button"
        [disabled]="desabilitado || valor >= max"
        [attr.aria-label]="'Aumentar ' + rotulo.toLowerCase()"
        (click)="mudar(valor + 1)"
      >
        <uz-icone nome="mais" [tamanho]="18"></uz-icone>
      </button>
    </div>
  `,
  styles: [`
    .qtd {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--uz-borda-campo);
      border-radius: var(--uz-raio-s);
      background: var(--uz-superficie);
    }
    .qtd__entrada {
      width: 3rem;
      height: var(--uz-alvo);
      border: 0;
      background: transparent;
      color: var(--uz-tinta);
      font: inherit;
      text-align: center;
      -moz-appearance: textfield;
    }
    .qtd__entrada::-webkit-inner-spin-button,
    .qtd__entrada::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `],
})
export class QtdComponent {
  @Input() valor = 1;
  @Input() min = 1;
  @Input() max = 99;
  /** Nome acessível do grupo e do campo, ex.: "Quantidade de Blusa Linho". */
  @Input() rotulo = 'Quantidade';
  @Input() desabilitado = false;
  @Output() valorChange = new EventEmitter<number>();

  mudar(novo: number): void {
    const limitado = Math.min(this.max, Math.max(this.min, Math.round(novo) || this.min));
    if (limitado !== this.valor) this.valorChange.emit(limitado);
  }
}
