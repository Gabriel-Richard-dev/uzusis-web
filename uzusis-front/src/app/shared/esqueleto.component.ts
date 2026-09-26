import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

/**
 * Placeholder de carregamento (decorativo, aria-hidden). O host é display: contents: os cartões viram
 * itens da grade de quem usa. Marque o contêiner com aria-busy="true" enquanto carrega.
 */
@Component({
  selector: 'uz-esqueleto',
  template: `
    @for (_ of itens; track _) {
      <div class="mb-3 flex flex-col gap-2">
        @if (formato === 'cartao') {
          <div hlmSkeleton class="aspect-[3/4] rounded-lg"></div>
        }
        <div hlmSkeleton class="h-4"></div>
        @if (formato === 'cartao') {
          <div hlmSkeleton class="h-4 w-2/5"></div>
        }
      </div>
    }
  `,
  host: { 'aria-hidden': 'true', class: 'contents' },
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmSkeletonImports],
})
export class EsqueletoComponent {
  @Input() formato: 'cartao' | 'linha' = 'linha';
  @Input() quantidade = 3;

  get itens(): number[] {
    return Array.from({ length: this.quantidade }, (_, i) => i);
  }
}
