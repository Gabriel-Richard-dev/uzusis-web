import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLinkActive, RouterLink, RouterOutlet } from '@angular/router';

/** Página /conta: o único h1 e as abas; cada aba é uma rota filha (link com aria-current, não role=tab). */
@Component({
  selector: 'uz-conta',
  template: `
    <section class="uz-container pb-16">
      <h1 class="uz-titulo" tabindex="-1">Minha conta</h1>
      <nav aria-label="Seções da conta" class="inline-flex max-w-full gap-1 rounded-full bg-muted p-1">
        @for (aba of abas; track aba.caminho) {
          <a
            [routerLink]="aba.caminho"
            routerLinkActive
            ariaCurrentWhenActive="page"
            class="inline-flex h-11 items-center rounded-full px-5 text-sm font-medium whitespace-nowrap text-muted-foreground no-underline hover:text-foreground aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-xs"
          >
            {{ aba.rotulo }}
          </a>
        }
      </nav>
      <div class="pt-6">
        <router-outlet />
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLinkActive, RouterLink, RouterOutlet],
})
export class ContaComponent {
  readonly abas = [
    { caminho: 'pedidos', rotulo: 'Meus pedidos' },
    { caminho: 'dados', rotulo: 'Meus dados' },
  ];
}
