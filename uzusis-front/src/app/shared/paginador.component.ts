import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { IconeComponent } from './icone.component';

/** "1 – 20 de 37"; sem itens, "0 de N" (mesmo texto do paginador pt-BR da v1). `pagina` começa em 0. */
export function rotuloIntervalo(pagina: number, tamanho: number, total: number): string {
  if (total === 0 || tamanho === 0) return `0 de ${total}`;
  const inicio = pagina * tamanho;
  return `${inicio + 1} – ${Math.min(inicio + tamanho, total)} de ${total}`;
}

/** Anterior/próxima com o intervalo anunciado (o paginador da v1 sem seletor de tamanho). */
@Component({
  selector: 'uz-paginador',
  template: `
    <nav aria-label="Paginação" class="flex items-center justify-end gap-2 py-2">
      <p class="m-0 me-2 text-sm text-muted-foreground tabular-nums" aria-live="polite">{{ rotulo() }}</p>
      <!-- Com uma página só, os botões (sempre desabilitados) somem. -->
      @if (total() > tamanho()) {
        <button
          hlmBtn
          variant="outline"
          size="icon"
          type="button"
          aria-label="Página anterior"
          [disabled]="pagina() <= 0"
          (click)="mudar.emit(pagina() - 1)"
        >
          <uz-icone nome="chevron-esquerda" [tamanho]="18" />
        </button>
        <button
          hlmBtn
          variant="outline"
          size="icon"
          type="button"
          aria-label="Próxima página"
          [disabled]="(pagina() + 1) * tamanho() >= total()"
          (click)="mudar.emit(pagina() + 1)"
        >
          <uz-icone nome="chevron-direita" [tamanho]="18" />
        </button>
      }
    </nav>
  `,
  // Só signals: OnPush basta.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, IconeComponent],
})
export class PaginadorComponent {
  /** Índice da página atual, a partir de 0 (o `number` do Page do Spring). */
  readonly pagina = input.required<number>();
  readonly tamanho = input.required<number>();
  readonly total = input.required<number>();
  /** Novo índice (0-based). */
  readonly mudar = output<number>();

  protected readonly rotulo = computed(() => rotuloIntervalo(this.pagina(), this.tamanho(), this.total()));
}
