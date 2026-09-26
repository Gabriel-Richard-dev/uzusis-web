import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, pairwise } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor() {
    // WCAG 2.4.3: depois de navegar (menos a primeira carga), o foco vai para o h1 da página.
    // Só quando o caminho muda: filtro/página na query (?q=, ?situacao=, ?pagina=) não tira o foco do controle usado.
    inject(Router)
      .events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(e => e.urlAfterRedirects.split(/[?#]/)[0]),
        pairwise(),
        filter(([antes, agora]) => antes !== agora),
        takeUntilDestroyed(),
      )
      .subscribe(() => setTimeout(() => this.focarConteudo()));
  }

  pularParaConteudo(evento: Event): void {
    evento.preventDefault(); // href="#conteudo" com <base href="/"> navegaria para /#conteudo
    this.focarConteudo();
  }

  /** O h1 (tabindex="-1") da página; enquanto ela carrega, o próprio <main>. */
  private focarConteudo(): void {
    const alvo = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main');
    alvo?.focus({ preventScroll: true });
  }
}
