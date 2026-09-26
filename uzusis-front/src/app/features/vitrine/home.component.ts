import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { CATEGORIAS, ProdutoResposta } from '../../core/api/modelos';

@Component({
  selector: 'uz-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categorias = CATEGORIAS;
  readonly mensagemDeErro = mensagemDeErro;
  /** null enquanto carrega. */
  novidades: ProdutoResposta[] | null = null;
  erro: unknown = null;

  constructor() {
    this.carregar();
  }

  carregar(): void {
    this.novidades = null;
    this.erro = null;
    this.catalogo
      .listar({ size: 8, sort: 'criadoEm,desc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: p => (this.novidades = p.content), error: e => (this.erro = e) });
  }

  /** 1ª foto do produto mais recente que tem foto; sem ela, o hero mostra só o bloco de cor. */
  get fotoHero(): string | null {
    return this.novidades?.find(p => p.fotos.length)?.fotos[0].url ?? null;
  }

  porId(_: number, p: ProdutoResposta): number {
    return p.id;
  }
}
