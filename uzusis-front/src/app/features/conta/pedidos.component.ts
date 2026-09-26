import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { filter, finalize, switchMap, tap } from 'rxjs';

import { mensagemDeErro } from '../../core/api/erros';
import { PedidoResposta } from '../../core/api/modelos';
import { PedidosService } from '../../core/api/pedidos.service';
import { AvisoService } from '../../core/util/aviso.service';
import { aplicarMascara } from '../../shared/mascara.directive';
import { EstadoComponent } from '../../shared/estado.component';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { StatusPedidoComponent } from '../../shared/status-pedido.component';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelContent } from '@angular/material/expansion';
import { LinhaDoTempoComponent } from '../../shared/linha-do-tempo.component';
import { SlicePipe, CurrencyPipe, DatePipe } from '@angular/common';

/** /conta/pedidos: O7 em cartões, com detalhes expansíveis e confirmação de recebimento (O9). */
@Component({
    selector: 'uz-conta-pedidos',
    templateUrl: './pedidos.component.html',
    styleUrls: ['./pedidos.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [EstadoComponent, MatButton, RouterLink, StatusPedidoComponent, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle, MatExpansionPanelContent, LinhaDoTempoComponent, SlicePipe, CurrencyPipe, DatePipe]
})
export class PedidosComponent implements OnInit {
  private readonly api = inject(PedidosService);
  private readonly aviso = inject(AvisoService);

  pedidos: PedidoResposta[] | null = null;
  erro: string | null = null;
  recebendo: number | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.pedidos = null;
    this.erro = null;
    this.api.listar().subscribe({
      next: pedidos => (this.pedidos = pedidos),
      error: err => (this.erro = mensagemDeErro(err)),
    });
  }

  confirmarRecebimento(pedido: PedidoResposta): void {
    this.aviso
      .confirmar('Confirmar recebimento', `Você recebeu o pedido #${pedido.id}?`, 'Confirmar recebimento')
      .pipe(
        filter(Boolean),
        tap(() => (this.recebendo = pedido.id)),
        switchMap(() => this.api.receber(pedido.id)),
        finalize(() => (this.recebendo = null)),
      )
      .subscribe({
        next: atualizado => {
          this.pedidos = (this.pedidos ?? []).map(p => (p.id === atualizado.id ? atualizado : p));
          this.aviso.sucesso(`Recebimento do pedido #${pedido.id} confirmado.`);
        },
        error: err => this.aviso.erro(err),
      });
  }

  telefone(valor: string): string {
    return aplicarMascara('celular', valor);
  }

  porId(_: number, pedido: PedidoResposta): number {
    return pedido.id;
  }
}
