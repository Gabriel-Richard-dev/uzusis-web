import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { forkJoin } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { PedidoResposta, ResumoAdmin } from '../../core/api/modelos';
import { PedidosService } from '../../core/api/pedidos.service';
import { EstadoComponent } from '../../shared/estado.component';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { CurrencyPipe, DatePipe } from '@angular/common';

interface Painel {
  resumo: ResumoAdmin;
  semEstoque: number;
  proximos: PedidoResposta[];
}

@Component({
    selector: 'uz-painel',
    templateUrl: './painel.component.html',
    styleUrls: ['./painel.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [EstadoComponent, RouterLink, MatButton, CurrencyPipe, DatePipe]
})
export class PainelComponent {
  private readonly pedidos = inject(PedidosService);
  private readonly catalogo = inject(CatalogoService);
  readonly mensagemDeErro = mensagemDeErro;

  painel: Painel | null = null;
  carregando = true;
  erro: unknown = null;

  constructor() {
    this.carregar();
  }

  /** Tudo ou nada: com qualquer falha mostra o erro, nunca zeros falsos. */
  carregar(): void {
    this.carregando = true;
    this.erro = null;
    forkJoin({
      resumo: this.pedidos.resumo(),
      semEstoque: this.catalogo.listarAdmin({ ativo: true, disponivel: false, size: 1 }),
      proximos: this.pedidos.listarAdmin({ status: ['PAGO'], size: 5, sort: 'pagoEm,asc' }),
    }).subscribe({
      next: r => {
        this.painel = { resumo: r.resumo, semEstoque: r.semEstoque.totalElements, proximos: r.proximos.content };
        this.carregando = false;
      },
      error: e => {
        this.painel = null;
        this.erro = e;
        this.carregando = false;
      },
    });
  }

  pecas(p: PedidoResposta): number {
    return p.itens.reduce((n, i) => n + i.quantidade, 0);
  }
}
