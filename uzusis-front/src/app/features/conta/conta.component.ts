import { Component } from '@angular/core';

/** Página /conta: o único h1 e as abas; cada aba é uma rota filha. */
@Component({
  selector: 'uz-conta',
  template: `
    <section class="uz-container conta">
      <h1 class="uz-titulo" tabindex="-1">Minha conta</h1>
      <nav mat-tab-nav-bar mat-stretch-tabs="false" [tabPanel]="painel" aria-label="Seções da conta">
        <a
          *ngFor="let aba of abas"
          mat-tab-link
          [routerLink]="aba.caminho"
          routerLinkActive
          #ativa="routerLinkActive"
          [active]="ativa.isActive"
        >
          {{ aba.rotulo }}
        </a>
      </nav>
      <mat-tab-nav-panel #painel class="conta__painel">
        <router-outlet></router-outlet>
      </mat-tab-nav-panel>
    </section>
  `,
  styles: [`
    .conta {
      padding-bottom: var(--uz-esp-8);
    }
    .conta__painel {
      display: block;
      padding-top: var(--uz-esp-5);
    }
  `],
})
export class ContaComponent {
  readonly abas = [
    { caminho: 'pedidos', rotulo: 'Meus pedidos' },
    { caminho: 'dados', rotulo: 'Meus dados' },
  ];
}
