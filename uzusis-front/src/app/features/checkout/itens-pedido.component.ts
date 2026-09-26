import { CurrencyPipe } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { ItemResposta } from '../../core/api/modelos';

/** Linhas de itens (sacola ou pedido), usadas no resumo do checkout e na confirmação. */
@Component({
    selector: 'uz-itens-pedido',
    imports: [CurrencyPipe],
    template: `
    <ul>
      @for (item of itens; track item) {
        <li class="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b py-3">
          @if (item.fotoUrl) {
            <img
              class="block h-[75px] w-14 rounded-md object-cover"
              [src]="item.fotoUrl"
              alt=""
              width="56"
              height="75"
              loading="lazy"
              />
          } @else {
            <span class="block h-[75px] w-14 rounded-md bg-secondary"></span>
          }
          <span class="flex min-w-0 flex-col">
            <span class="font-medium wrap-anywhere">{{ item.nomeProduto }}</span>
            <span class="text-sm text-muted-foreground">Tamanho {{ item.sigla }} · Qtd. {{ item.quantidade }}</span>
          </span>
          <span class="font-semibold whitespace-nowrap">{{ item.valorTotal | currency }}</span>
        </li>
      }
    </ul>
    `,
    changeDetection: ChangeDetectionStrategy.Eager,
})
export class ItensPedidoComponent {
  @Input({ required: true }) itens: readonly ItemResposta[] = [];
}
