import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';

import { IconeComponent } from './icone.component';

/**
 * Estado de página ou bloco: carregando, vazio ou erro. Ações extras via ng-content.
 * "Tentar novamente" só aparece no erro e se alguém escutar (tentarNovamente).
 */
@Component({
  selector: 'uz-estado',
  template: `
    <div
      class="flex flex-col items-center gap-3 px-4 py-12 text-center text-foreground"
      [attr.role]="tipo === 'erro' ? 'alert' : 'status'"
      [attr.aria-busy]="tipo === 'carregando' ? 'true' : null"
    >
      @if (tipo === 'carregando') {
        <hlm-spinner class="text-[2.5rem] text-muted-foreground" aria-hidden="true" />
      }
      @if (tipo === 'erro') {
        <uz-icone nome="alerta" class="text-destructive" [tamanho]="32"></uz-icone>
      }
      @if (titulo) {
        <p class="m-0 font-display text-h3">{{ titulo }}</p>
      }
      @if (mensagem || tipo === 'carregando') {
        <p class="m-0 max-w-xl text-muted-foreground">{{ mensagem || 'Carregando…' }}</p>
      }
      <div class="flex flex-wrap justify-center gap-3 empty:hidden">
        <ng-content></ng-content>
        @if (tipo === 'erro' && tentarNovamente.observed) {
          <button hlmBtn variant="outline" type="button" (click)="tentarNovamente.emit()">Tentar novamente</button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmButtonImports, HlmSpinnerImports, IconeComponent],
})
export class EstadoComponent {
  @Input({ required: true }) tipo!: 'carregando' | 'vazio' | 'erro';
  @Input() titulo?: string;
  @Input() mensagem?: string | null;
  @Output() tentarNovamente = new EventEmitter<void>();
}
