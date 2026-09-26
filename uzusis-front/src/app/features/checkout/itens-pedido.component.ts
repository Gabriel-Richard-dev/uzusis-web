import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { ItemResposta } from '../../core/api/modelos';

/** Linhas de itens (sacola ou pedido), usadas no resumo do checkout e na confirmação. */
@Component({
    selector: 'uz-itens-pedido',
    imports: [CommonModule],
    template: `
    <ul class="itens">
      @for (item of itens; track item) {
        <li class="item">
          @if (item.fotoUrl) {
            <img
              class="item__foto"
              [src]="item.fotoUrl"
              alt=""
              width="56"
              height="75"
              loading="lazy"
              />
          } @else {
            <span class="item__foto item__foto--vazia"></span>
          }
          <span class="item__info">
            <span class="item__nome">{{ item.nomeProduto }}</span>
            <span class="item__detalhe">Tamanho {{ item.sigla }} · Qtd. {{ item.quantidade }}</span>
          </span>
          <span class="item__valor">{{ item.valorTotal | currency }}</span>
        </li>
      }
    </ul>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    .itens {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .item {
      display: grid;
      grid-template-columns: 56px minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--uz-esp-3);
      padding-block: var(--uz-esp-3);
      border-bottom: 1px solid var(--uz-borda);
    }
    .item__foto {
      display: block;
      width: 56px;
      height: 75px;
      object-fit: cover;
    }
    .item__foto--vazia {
      background: var(--uz-areia);
    }
    .item__info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .item__nome {
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .item__detalhe {
      font-size: var(--uz-fs-pequeno);
      color: var(--uz-tinta-suave);
    }
    .item__valor {
      font-weight: 600;
      white-space: nowrap;
    }
  `]
})
export class ItensPedidoComponent {
  @Input({ required: true }) itens: readonly ItemResposta[] = [];
}
