import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

import { ProdutoResposta } from '../../core/api/modelos';
import { ultimasUnidades } from './vitrine';

@Component({
  selector: 'uz-produto-card',
  template: `
    <a class="group flex flex-col gap-1 text-foreground no-underline" [routerLink]="['/produto', produto.id]">
      <span class="relative mb-2 block aspect-[3/4] overflow-hidden rounded-lg bg-secondary">
        @if (produto.fotos[0]; as foto) {
          <img
            class="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            [src]="foto.url"
            [alt]="produto.nome"
            width="300"
            height="400"
            loading="lazy"
          />
        }
        @if (ultimas) {
          <span hlmBadge class="absolute top-2 left-2 bg-card text-foreground shadow-xs">Últimas unidades</span>
        }
      </span>
      <span class="text-sm wrap-anywhere group-hover:underline">{{ produto.nome }}</span>
      <span class="uz-preco">{{ produto.preco | currency }}</span>
    </a>
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink, CurrencyPipe, HlmBadgeImports],
})
export class ProdutoCardComponent {
  @Input({ required: true }) produto!: ProdutoResposta;

  get ultimas(): boolean {
    return ultimasUnidades(this.produto);
  }
}
