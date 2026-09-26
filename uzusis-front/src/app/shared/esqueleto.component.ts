import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

/**
 * Placeholder de carregamento (decorativo, aria-hidden). O host é display: contents: os cartões viram
 * itens da grade de quem usa. Marque o contêiner com aria-busy="true" enquanto carrega.
 */
@Component({
    selector: 'uz-esqueleto',
    template: `
    @for (_ of itens; track _) {
      <div class="esq" [class.esq--cartao]="formato === 'cartao'">
        @if (formato === 'cartao') {
          <div class="esq__bloco esq__foto"></div>
        }
        <div class="esq__bloco esq__barra"></div>
        @if (formato === 'cartao') {
          <div class="esq__bloco esq__barra esq__barra--curta"></div>
        }
      </div>
    }
    `,
    host: { 'aria-hidden': 'true' },
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    :host {
      display: contents;
    }
    .esq {
      display: flex;
      flex-direction: column;
      gap: var(--uz-esp-2);
      margin-bottom: var(--uz-esp-3);
    }
    .esq__bloco {
      border-radius: var(--uz-raio-s);
      background: linear-gradient(90deg, var(--uz-areia) 25%, var(--uz-papel) 50%, var(--uz-areia) 75%);
      background-size: 200% 100%;
      animation: brilho 1.4s ease-in-out infinite;
    }
    .esq__foto {
      aspect-ratio: 3 / 4;
      border-radius: 0;
    }
    .esq__barra {
      height: 1rem;
    }
    .esq__barra--curta {
      width: 40%;
    }
    @keyframes brilho {
      from { background-position: 100% 0; }
      to { background-position: -100% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .esq__bloco { animation: none; }
    }
  `]
})
export class EsqueletoComponent {
  @Input() formato: 'cartao' | 'linha' = 'linha';
  @Input() quantidade = 3;

  get itens(): number[] {
    return Array.from({ length: this.quantidade }, (_, i) => i);
  }
}
