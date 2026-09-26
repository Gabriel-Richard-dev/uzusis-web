import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'uz-nao-encontrado',
    template: `
    <section class="uz-container nao-encontrado">
      <h1 class="uz-titulo" tabindex="-1">Página não encontrada</h1>
      <p class="uz-texto-suave">O endereço pode ter mudado, ou a página não existe mais.</p>
      <div class="nao-encontrado__acoes">
        <a mat-flat-button color="primary" routerLink="/">Ir para o início</a>
        <a mat-stroked-button routerLink="/loja">Ver a loja</a>
      </div>
    </section>
  `,
    styles: [`
    .nao-encontrado { padding-block: var(--uz-esp-7); text-align: center; }
    .nao-encontrado__acoes { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--uz-esp-3); }
  `],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatButton, RouterLink]
})
export class NaoEncontradoComponent {}
