import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { IconeComponent } from './icone.component';
import { MatButton } from '@angular/material/button';

/**
 * Estado de página ou bloco: carregando, vazio ou erro. Ações extras via ng-content.
 * "Tentar novamente" só aparece no erro e se alguém escutar (tentarNovamente).
 */
@Component({
    selector: 'uz-estado',
    template: `
    <div
      class="estado"
      [class.estado--erro]="tipo === 'erro'"
      [attr.role]="tipo === 'erro' ? 'alert' : 'status'"
      [attr.aria-busy]="tipo === 'carregando' ? 'true' : null"
      >
      @if (tipo === 'carregando') {
        <mat-progress-spinner
          mode="indeterminate"
          diameter="40"
          aria-label="Carregando"
        ></mat-progress-spinner>
      }
      @if (tipo === 'erro') {
        <uz-icone nome="alerta" [tamanho]="32"></uz-icone>
      }
      @if (titulo) {
        <p class="estado__titulo">{{ titulo }}</p>
      }
      @if (mensagem || tipo === 'carregando') {
        <p class="estado__mensagem">{{ mensagem || 'Carregando…' }}</p>
      }
      <div class="estado__acoes">
        <ng-content></ng-content>
        @if (tipo === 'erro' && tentarNovamente.observed) {
          <button mat-stroked-button type="button" (click)="tentarNovamente.emit()">
            Tentar novamente
          </button>
        }
      </div>
    </div>
    `,
    styles: [`
    .estado {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uz-esp-3);
      padding: var(--uz-esp-7) var(--uz-esp-4);
      text-align: center;
      color: var(--uz-tinta);
    }
    .estado--erro uz-icone {
      color: var(--uz-erro);
    }
    .estado__titulo {
      margin: 0;
      font-family: var(--uz-fonte-titulo);
      font-size: var(--uz-fs-h3);
    }
    .estado__mensagem {
      margin: 0;
      max-width: 36rem;
      color: var(--uz-tinta-suave);
    }
    .estado__acoes {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--uz-esp-3);
    }
    .estado__acoes:empty {
      display: none;
    }
  `],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatProgressSpinner, IconeComponent, MatButton]
})
export class EstadoComponent {
  @Input({ required: true }) tipo!: 'carregando' | 'vazio' | 'erro';
  @Input() titulo?: string;
  @Input() mensagem?: string | null;
  @Output() tentarNovamente = new EventEmitter<void>();
}
