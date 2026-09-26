import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { CATEGORIAS, ProdutoResposta } from '../../core/api/modelos';
import { EsqueletoComponent } from '../../shared/esqueleto.component';
import { EstadoComponent } from '../../shared/estado.component';
import { IconeComponent } from '../../shared/icone.component';
import { ProdutoCardComponent } from './produto-card.component';

@Component({
  selector: 'uz-home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmButtonImports, RouterLink, IconeComponent, EstadoComponent, EsqueletoComponent, ProdutoCardComponent],
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
}
