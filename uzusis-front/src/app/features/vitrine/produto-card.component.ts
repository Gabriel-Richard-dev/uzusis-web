import { Component, Input } from '@angular/core';

import { ProdutoResposta } from '../../core/api/modelos';
import { ultimasUnidades } from './vitrine';

@Component({
  selector: 'uz-produto-card',
  template: `
    <a class="card" [routerLink]="['/produto', produto.id]">
      <span class="card__foto">
        <img
          *ngIf="produto.fotos[0] as foto"
          [src]="foto.url"
          [alt]="produto.nome"
          width="300"
          height="400"
          loading="lazy"
        />
        <span *ngIf="ultimas" class="card__selo">Últimas unidades</span>
      </span>
      <span class="card__nome">{{ produto.nome }}</span>
      <span class="uz-preco">{{ produto.preco | currency }}</span>
    </a>
  `,
  styles: [`
    :host { display: block; }
    .card {
      display: flex;
      flex-direction: column;
      gap: var(--uz-esp-1);
      color: var(--uz-tinta);
      text-decoration: none;
    }
    .card:hover { color: var(--uz-tinta); }
    .card:hover .card__nome { text-decoration: underline; }
    .card__foto {
      position: relative;
      display: block;
      aspect-ratio: 3 / 4;
      margin-bottom: var(--uz-esp-2);
      overflow: hidden;
      background: var(--uz-areia);
    }
    .card__foto img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .card:hover .card__foto img { transform: scale(1.03); }
    .card__selo {
      position: absolute;
      top: var(--uz-esp-2);
      left: var(--uz-esp-2);
      padding: var(--uz-esp-1) var(--uz-esp-2);
      border-radius: var(--uz-raio-pill);
      background: var(--uz-superficie);
      color: var(--uz-tinta);
      font-size: var(--uz-fs-legenda);
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .card__nome {
      overflow-wrap: anywhere;
      font-size: var(--uz-fs-pequeno);
    }
  `],
})
export class ProdutoCardComponent {
  @Input({ required: true }) produto!: ProdutoResposta;

  get ultimas(): boolean {
    return ultimasUnidades(this.produto);
  }
}
