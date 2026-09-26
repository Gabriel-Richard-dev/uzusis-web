import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { mensagemDeErro } from '../../core/api/erros';
import { PedidoResposta, StatusPedido } from '../../core/api/modelos';
import { PedidosService } from '../../core/api/pedidos.service';
import { SacolaService } from '../../core/api/sacola.service';
import { acompanharPedido, foiRecusado, marcarRecusado } from './fluxo';

const TITULO: Record<StatusPedido, string> = {
  CRIADO: 'Processando pagamento…',
  PAGO: 'Pedido confirmado!',
  ENVIADO: 'Pedido enviado',
  RECEBIDO: 'Pedido recebido',
  CANCELADO: 'Pedido cancelado',
};

/** /pedido/:id: confirmação com polling do O8 enquanto CRIADO (§7.3). */
@Component({
  selector: 'uz-pedido-status',
  templateUrl: './pedido-status.component.html',
  styleUrls: ['./pedido-status.component.scss'],
})
export class PedidoStatusComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly pedidos = inject(PedidosService);
  private readonly sacola = inject(SacolaService);
  private readonly destroyRef = inject(DestroyRef);

  pedido?: PedidoResposta;
  erro = '';
  /** ?recusado=1 (checkout) ou redirect_status=failed (Stripe): sem o link de concluir o pagamento. */
  recusado = false;
  /** 2 min em CRIADO: para o polling e oferece "Atualizar". */
  demorou = false;
  /** Texto do aria-live. */
  anuncio = '';
  private id = 0;
  private polling?: Subscription;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.id = Number(params.get('id'));
      const query = this.route.snapshot.queryParamMap;
      if (query.get('redirect_status') === 'failed') marcarRecusado(this.id);
      this.recusado = query.get('recusado') === '1' || foiRecusado(this.id);
      this.pedido = undefined;
      this.acompanhar();
    });
  }

  get titulo(): string {
    const status = this.pedido?.status;
    if (!status) return 'Seu pedido';
    return status === 'CRIADO' && this.recusado ? 'Pagamento recusado' : TITULO[status];
  }

  acompanhar(): void {
    this.polling?.unsubscribe();
    this.erro = '';
    this.demorou = false;
    this.polling = acompanharPedido(() => this.pedidos.obter(this.id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => this.atualizar(p),
        error: err => (this.erro = mensagemDeErro(err)),
        complete: () => (this.demorou = this.pedido?.status === 'CRIADO'),
      });
  }

  private atualizar(p: PedidoResposta): void {
    const mudou = p.status !== this.pedido?.status;
    this.pedido = p;
    if (!mudou) return;
    this.anuncio = `Pedido #${p.id}: ${this.titulo}`;
    // A recusa devolveu os itens: o badge da sacola já mostra.
    if (p.status === 'CANCELADO' && p.sacolaRestaurada) this.sacola.carregar();
  }
}
