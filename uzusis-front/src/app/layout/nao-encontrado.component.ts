import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'uz-nao-encontrado',
  template: `
    <section class="uz-container py-12 text-center">
      <h1 class="uz-titulo" tabindex="-1">Página não encontrada</h1>
      <p class="text-muted-foreground">O endereço pode ter mudado, ou a página não existe mais.</p>
      <div class="flex flex-wrap justify-center gap-3">
        <a hlmBtn routerLink="/">Ir para o início</a>
        <a hlmBtn variant="outline" routerLink="/loja">Ver a loja</a>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, RouterLink],
})
export class NaoEncontradoComponent {}
