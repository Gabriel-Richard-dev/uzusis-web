import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, filter, finalize, map, of, switchMap, tap } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { CATEGORIAS, CategoriaProduto, FiltroProdutosAdmin, Pagina, ProdutoResposta } from '../../core/api/modelos';
import { AvisoService } from '../../core/util/aviso.service';
import { SITUACOES, Situacao, filtroDaSituacao, situacaoDo } from './admin-util';
import { NgTemplateOutlet, CurrencyPipe } from '@angular/common';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { EsqueletoComponent } from '../../shared/esqueleto.component';
import { EstadoComponent } from '../../shared/estado.component';
import { IconeComponent } from '../../shared/icone.component';
import { PaginadorComponent } from '../../shared/paginador.component';

const POR_PAGINA = 20;

/** Lista do C4. Os filtros e a página moram na URL (?q, categoria, situacao, pagina). */
@Component({
    selector: 'uz-produtos',
    templateUrl: './produtos.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
      RouterLink,
      ReactiveFormsModule,
      NgTemplateOutlet,
      CurrencyPipe,
      HlmButtonImports,
      HlmCardImports,
      HlmFieldImports,
      HlmInputGroupImports,
      HlmNativeSelectImports,
      HlmProgressImports,
      HlmTableImports,
      EsqueletoComponent,
      EstadoComponent,
      IconeComponent,
      PaginadorComponent,
    ]
})
export class ProdutosComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly aviso = inject(AvisoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mensagemDeErro = mensagemDeErro;
  readonly situacaoDo = situacaoDo;
  readonly categorias = CATEGORIAS;
  readonly situacoes = SITUACOES;
  readonly porPagina = POR_PAGINA;
  readonly rotuloSituacao = Object.fromEntries(SITUACOES.map(s => [s.valor, s.nome]));
  /** Mesmas cores do uz-status-pedido (AA sobre o fundo). */
  readonly corSituacao: Record<Situacao, string> = {
    ativo: 'bg-success-muted text-success',
    inativo: 'bg-muted text-muted-foreground',
    'sem-estoque': 'bg-warning-muted text-warning',
  };

  readonly busca = new FormControl('', { nonNullable: true });
  readonly categoria = new FormControl('', { nonNullable: true });
  readonly situacao = new FormControl('', { nonNullable: true });

  pagina: Pagina<ProdutoResposta> | null = null;
  carregando = true;
  erro: unknown = null;
  filtrando = false;
  readonly ocupados = new Set<number>();

  private filtro: FiltroProdutosAdmin = {};
  private readonly pedido$ = new Subject<FiltroProdutosAdmin>();

  constructor() {
    this.pedido$
      .pipe(
        tap(() => {
          this.carregando = true;
          this.erro = null;
        }),
        switchMap(f =>
          this.catalogo.listarAdmin(f).pipe(
            catchError(e => {
              this.erro = e;
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(p => {
        // A página ficou vazia (o último produto dela saiu do filtro, ou ?pagina= além do fim): vai para a última.
        if (p && !p.content.length && p.number > 0) {
          this.navegar({ pagina: p.totalPages > 1 ? p.totalPages : null }, true);
          return;
        }
        this.carregando = false;
        this.pagina = p;
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(q => {
      const nome = q.get('q') ?? '';
      const categoria = q.get('categoria') ?? '';
      const situacao = q.get('situacao') ?? '';
      this.busca.setValue(nome, { emitEvent: false });
      this.categoria.setValue(categoria, { emitEvent: false });
      this.situacao.setValue(situacao, { emitEvent: false });
      this.filtrando = !!(nome || categoria || situacao);
      this.filtro = {
        nome,
        categoria: (categoria || null) as CategoriaProduto | null,
        ...filtroDaSituacao(situacao),
        page: Math.max(Number(q.get('pagina')) || 1, 1) - 1,
        size: POR_PAGINA,
        sort: 'criadoEm,desc',
      };
      this.carregar();
    });

    this.busca.valueChanges
      .pipe(
        debounceTime(300),
        map(v => v.trim()),
        // Compara com a URL, não com o último termo digitado: "Limpar filtros" e o voltar mudam a busca sem emitir.
        filter(q => q !== (this.filtro.nome ?? '')),
        takeUntilDestroyed(),
      )
      .subscribe(q => this.filtrar({ q: q || null }, true));
    this.categoria.valueChanges.pipe(takeUntilDestroyed()).subscribe(c => this.filtrar({ categoria: c || null }));
    this.situacao.valueChanges.pipe(takeUntilDestroyed()).subscribe(s => this.filtrar({ situacao: s || null }));
  }

  carregar(): void {
    this.pedido$.next(this.filtro);
  }

  /** Índice 0-based do uz-paginador; na URL a página começa em 1 (e a primeira some). */
  mudarPagina(indice: number): void {
    this.navegar({ pagina: indice ? indice + 1 : null });
  }

  limparFiltros(): void {
    void this.router.navigate([], { relativeTo: this.route });
  }

  /** Desativar (C9) ou reativar (C7 {ativo:true}), sempre com confirmação. */
  alternarAtivo(p: ProdutoResposta): void {
    const desativar = p.ativo;
    this.aviso
      .confirmar(
        desativar ? 'Desativar produto' : 'Reativar produto',
        desativar
          ? `"${p.nome}" deixa de aparecer na loja. Você pode reativá-lo depois.`
          : `"${p.nome}" volta a aparecer na loja quando tiver estoque.`,
        desativar ? 'Desativar' : 'Reativar',
      )
      .pipe(
        filter(Boolean),
        tap(() => this.ocupados.add(p.id)),
        switchMap(() => (desativar ? this.catalogo.desativar(p.id) : this.catalogo.atualizar(p.id, { ativo: true }))),
        finalize(() => this.ocupados.delete(p.id)),
      )
      .subscribe({
        next: () => {
          this.aviso.sucesso(desativar ? 'Produto desativado.' : 'Produto reativado.');
          this.carregar();
        },
        error: e => this.aviso.erro(e),
      });
  }

  private filtrar(params: Params, substituir = false): void {
    this.navegar({ ...params, pagina: null }, substituir);
  }

  private navegar(params: Params, substituir = false): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: substituir,
    });
  }
}
