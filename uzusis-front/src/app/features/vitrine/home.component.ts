import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { CATEGORIAS, CategoriaProduto, ProdutoResposta } from '../../core/api/modelos';
import { EsqueletoComponent } from '../../shared/esqueleto.component';
import { EstadoComponent } from '../../shared/estado.component';
import { IconeComponent } from '../../shared/icone.component';
import { ProdutoCardComponent } from './produto-card.component';
import { capasPorCategoria } from './vitrine';

@Component({
  selector: 'uz-home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmButtonImports, HlmSkeletonImports, RouterLink, IconeComponent, EstadoComponent, EsqueletoComponent, ProdutoCardComponent],
})
export class HomeComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categorias = CATEGORIAS;
  readonly mensagemDeErro = mensagemDeErro;
  /** null enquanto carrega. */
  novidades: ProdutoResposta[] | null = null;
  total = 0;
  /** null = carregando; categoria fora do mapa = círculo com a inicial. */
  capas: Map<CategoriaProduto, string> | null = null;
  erro: unknown = null;

  constructor() {
    this.carregar();
  }

  carregar(): void {
    this.novidades = null;
    this.capas = null;
    this.erro = null;
    // ponytail: capas só das 48 peças mais novas; categoria sem peça entre elas mostra a inicial.
    // Se incomodar com catálogo grande: 1 chamada size=1&categoria=X por categoria sem capa.
    this.catalogo
      .listar({ size: 48, sort: 'criadoEm,desc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => {
          this.novidades = p.content.slice(0, 8);
          this.total = p.totalElements;
          this.capas = capasPorCategoria(p.content);
        },
        error: e => {
          this.erro = e;
          this.capas = new Map();
        },
      });
  }
}
