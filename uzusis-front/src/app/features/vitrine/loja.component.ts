import { Component, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Subject, catchError, debounceTime, filter, map, of, switchMap } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { CATEGORIAS, Pagina, ProdutoResposta } from '../../core/api/modelos';
import { AvisoService } from '../../core/util/aviso.service';
import { FiltroLoja, ORDENS, acrescentar, lerFiltro, sortDe } from './vitrine';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { IconeComponent } from '../../shared/icone.component';
import { MatSelect, MatOption } from '@angular/material/select';
import { EstadoComponent } from '../../shared/estado.component';
import { EsqueletoComponent } from '../../shared/esqueleto.component';
import { ProdutoCardComponent } from './produto-card.component';

const TAMANHO_PAGINA = 12;

@Component({
    selector: 'uz-loja',
    templateUrl: './loja.component.html',
    styleUrls: ['./loja.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatFormField, MatLabel, MatInput, FormsModule, ReactiveFormsModule, MatIconButton, MatSuffix, IconeComponent, MatSelect, MatOption, EstadoComponent, EsqueletoComponent, MatButton, ProdutoCardComponent]
})
export class LojaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogo = inject(CatalogoService);
  private readonly aviso = inject(AvisoService);
  private readonly el: ElementRef<HTMLElement> = inject(ElementRef);
  /** Página pedida. O switchMap descarta a resposta de um pedido antigo (filtro trocado no meio). */
  private readonly pedido$ = new Subject<number>();

  readonly categorias = CATEGORIAS;
  readonly ordens = ORDENS;
  readonly mensagemDeErro = mensagemDeErro;
  readonly busca = new FormControl('', { nonNullable: true });

  filtro: FiltroLoja = { categoria: null, q: '', ordem: 'recentes' };
  produtos: ProdutoResposta[] = [];
  /** Última página recebida; null enquanto a primeira carrega. */
  pagina: Pagina<ProdutoResposta> | null = null;
  carregando = false;
  erro: unknown = null;

  constructor() {
    this.pedido$
      .pipe(
        switchMap(page =>
          this.catalogo.listar(this.consulta(page)).pipe(
            map(pagina => ({ page, pagina, erro: null as unknown })),
            catchError(erro => of({ page, pagina: null, erro })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ page, pagina, erro }) => {
        this.carregando = false;
        if (pagina) {
          this.pagina = pagina;
          this.produtos = page === 0 ? pagina.content : acrescentar(this.produtos, pagina.content);
        } else if (page === 0) {
          this.erro = erro;
        } else {
          this.aviso.erro(erro);
        }
      });

    // A URL é a fonte do estado: toda mudança nela recomeça a lista.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.filtro = lerFiltro(params);
      if (this.busca.value.trim() !== this.filtro.q) this.busca.setValue(this.filtro.q, { emitEvent: false });
      this.carregar();
      // no celular a faixa de categorias rola na horizontal: a categoria vinda por link fica visível
      setTimeout(() =>
        this.el.nativeElement.querySelector('.chip[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
      );
    });

    this.busca.valueChanges
      .pipe(
        debounceTime(300),
        map(v => v.trim()),
        filter(q => q.length !== 1 && q !== this.filtro.q),
        takeUntilDestroyed(),
      )
      .subscribe(q => this.filtrar({ q: q || null }, true));
  }

  get titulo(): string {
    return CATEGORIAS.find(c => c.valor === this.filtro.categoria)?.nome ?? 'Loja';
  }

  /** page 0 recomeça a lista; as seguintes acrescentam ("Carregar mais"). */
  carregar(page = 0): void {
    this.carregando = true;
    this.erro = null;
    if (page === 0) {
      this.produtos = [];
      this.pagina = null;
    }
    this.pedido$.next(page);
  }

  filtrar(params: Params, replaceUrl = false): void {
    // O AppComponent foca o h1 a cada navegação; num filtro da mesma página o foco volta ao controle usado.
    const foco = document.activeElement as HTMLElement | null;
    void this.router
      .navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl })
      .then(() => setTimeout(() => foco?.isConnected && foco.focus()));
  }

  limparFiltros(): void {
    this.busca.setValue('', { emitEvent: false });
    this.filtrar({ categoria: null, q: null });
  }

  porId(_: number, p: ProdutoResposta): number {
    return p.id;
  }

  private consulta(page: number) {
    const { categoria, q, ordem } = this.filtro;
    return { categoria, nome: q, page, size: TAMANHO_PAGINA, sort: sortDe(ordem) };
  }
}
