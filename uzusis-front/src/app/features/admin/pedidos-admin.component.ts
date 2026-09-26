import { Component, ElementRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, filter, finalize, of, switchMap, tap } from 'rxjs';

import { mensagemDeErro } from '../../core/api/erros';
import { FiltroPedidosAdmin, Pagina, PedidoResposta } from '../../core/api/modelos';
import { PedidosService } from '../../core/api/pedidos.service';
import { AvisoService } from '../../core/util/aviso.service';
import { aplicarMascara } from '../../shared/mascara.directive';
import { EstadoComponent } from '../../shared/estado.component';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { StatusPedidoComponent } from '../../shared/status-pedido.component';
import { CurrencyPipe, DatePipe } from '@angular/common';

const POR_PAGINA = 20;

const FILTROS: Record<'enviar' | 'historico', FiltroPedidosAdmin> = {
  enviar: { status: ['PAGO'], sort: 'pagoEm,asc' },
  historico: { status: ['ENVIADO', 'RECEBIDO'], sort: 'enviadoEm,desc' },
};

/** O10 paginado no servidor. /admin/pedidos (a enviar, com O11) e /admin/pedidos/historico. */
@Component({
    selector: 'uz-pedidos-admin',
    templateUrl: './pedidos-admin.component.html',
    styleUrls: ['./pedidos-admin.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [EstadoComponent, MatButton, RouterLink, MatProgressBar, StatusPedidoComponent, MatPaginator, CurrencyPipe, DatePipe]
})
export class PedidosAdminComponent {
  private readonly pedidos = inject(PedidosService);
  private readonly aviso = inject(AvisoService);
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;

  readonly modo: 'enviar' | 'historico' = inject(ActivatedRoute).snapshot.data['modo'];
  readonly mensagemDeErro = mensagemDeErro;
  readonly porPagina = POR_PAGINA;

  pagina: Pagina<PedidoResposta> | null = null;
  carregando = true;
  erro: unknown = null;
  readonly enviando = new Set<number>();

  private indice = 0;
  private readonly pedido$ = new Subject<void>();

  constructor() {
    this.pedido$
      .pipe(
        tap(() => {
          this.carregando = true;
          this.erro = null;
        }),
        switchMap(() =>
          this.pedidos.listarAdmin({ ...FILTROS[this.modo], page: this.indice, size: POR_PAGINA }).pipe(
            catchError(e => {
              this.erro = e;
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(p => {
        this.carregando = false;
        // A última página ficou vazia (o último pedido dela foi enviado): volta para a anterior.
        if (p && !p.content.length && p.number > 0) {
          this.indice = Math.max(p.totalPages - 1, 0);
          this.carregar();
          return;
        }
        this.pagina = p;
      });
    this.carregar();
  }

  carregar(): void {
    this.pedido$.next();
  }

  mudarPagina(e: PageEvent): void {
    this.indice = e.pageIndex;
    this.carregar();
    this.focarTitulo();
  }

  marcarEnviado(p: PedidoResposta): void {
    this.aviso
      .confirmar(
        'Marcar como enviado',
        `O pedido #${p.id} será marcado como enviado, e ${p.cliente.nome} receberá um e-mail avisando.`,
        'Marcar como enviado',
      )
      .pipe(
        filter(Boolean),
        tap(() => this.enviando.add(p.id)),
        switchMap(() => this.pedidos.enviar(p.id)),
        finalize(() => this.enviando.delete(p.id)),
      )
      .subscribe({
        next: () => {
          this.aviso.sucesso(`Pedido #${p.id} marcado como enviado.`);
          if (this.pagina) this.pagina = { ...this.pagina, content: this.pagina.content.filter(x => x.id !== p.id) };
          this.carregar();
          this.focarTitulo(); // o cartão (e o botão com foco) saiu da tela
        },
        error: e => this.aviso.erro(e),
      });
  }

  telefone(p: PedidoResposta): string {
    return aplicarMascara('celular', p.endereco.telefone ?? '');
  }

  pecas(p: PedidoResposta): number {
    return p.itens.reduce((n, i) => n + i.quantidade, 0);
  }

  porId(_: number, p: PedidoResposta): number {
    return p.id;
  }

  private focarTitulo(): void {
    setTimeout(() => this.el.querySelector<HTMLElement>('h1')?.focus());
  }
}
