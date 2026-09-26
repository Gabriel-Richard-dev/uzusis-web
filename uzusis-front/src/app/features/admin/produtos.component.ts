import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, filter, finalize, map, of, switchMap, tap } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { CATEGORIAS, CategoriaProduto, FiltroProdutosAdmin, Pagina, ProdutoResposta } from '../../core/api/modelos';
import { AvisoService } from '../../core/util/aviso.service';
import { SITUACOES, filtroDaSituacao, situacaoDo } from './admin-util';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { EsqueletoComponent } from '../../shared/esqueleto.component';
import { EstadoComponent } from '../../shared/estado.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { NgTemplateOutlet, NgClass, CurrencyPipe } from '@angular/common';

const POR_PAGINA = 20;

/** Lista do C4. Os filtros e a página moram na URL (?q, categoria, situacao, pagina). */
@Component({
    selector: 'uz-produtos',
    templateUrl: './produtos.component.html',
    styleUrls: ['./produtos.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatButton, RouterLink, MatFormField, MatLabel, MatInput, FormsModule, ReactiveFormsModule, MatSelect, MatOption, EsqueletoComponent, EstadoComponent, MatProgressBar, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, NgTemplateOutlet, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, NgClass, CurrencyPipe]
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
  readonly colunas = ['foto', 'nome', 'categoria', 'preco', 'estoque', 'situacao', 'acoes'];
  readonly rotuloSituacao = Object.fromEntries(SITUACOES.map(s => [s.valor, s.nome]));

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

  mudarPagina(e: PageEvent): void {
    this.navegar({ pagina: e.pageIndex ? e.pageIndex + 1 : null });
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

  porId(_: number, p: ProdutoResposta): number {
    return p.id;
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
