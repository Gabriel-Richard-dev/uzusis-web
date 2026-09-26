import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { IconeComponent } from './icone.component';

/**
 * Seletor de quantidade controlado: só emite (valorChange); quem usa atualiza [valor].
 * Use [(valor)] para estado local, ou [valor] + (valorChange) quando a mudança depende do servidor.
 */
@Component({
  selector: 'uz-qtd',
  template: `
    <div
      class="inline-flex items-center rounded-md border border-input bg-card shadow-xs"
      role="group"
      [attr.aria-label]="rotulo"
      [class.opacity-50]="desabilitado"
    >
      <button
        hlmBtn
        variant="ghost"
        size="icon"
        type="button"
        [disabled]="desabilitado || valor <= min"
        [attr.aria-label]="'Diminuir ' + rotulo.toLowerCase()"
        (click)="mudar(valor - 1)"
      >
        <uz-icone nome="menos" [tamanho]="18"></uz-icone>
      </button>
      <input
        #entrada
        class="h-11 w-12 [appearance:textfield] border-0 bg-transparent text-center text-base tabular-nums text-foreground outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
        hlmBtn
        variant="ghost"
        size="icon"
        type="button"
        [disabled]="desabilitado || valor >= max"
        [attr.aria-label]="'Aumentar ' + rotulo.toLowerCase()"
        (click)="mudar(valor + 1)"
      >
        <uz-icone nome="mais" [tamanho]="18"></uz-icone>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmButtonImports, IconeComponent],
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
