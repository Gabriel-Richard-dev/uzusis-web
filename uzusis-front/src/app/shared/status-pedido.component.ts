import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { STATUS_ROTULO, StatusPedido } from '../core/api/modelos';
import { NgClass } from '@angular/common';

const COR: Record<StatusPedido, 'sucesso' | 'aviso' | 'erro'> = {
  CRIADO: 'aviso',
  PAGO: 'sucesso',
  ENVIADO: 'aviso',
  RECEBIDO: 'sucesso',
  CANCELADO: 'erro',
};

@Component({
    selector: 'uz-status-pedido',
    template: `<span class="status" [ngClass]="'status--' + cor">{{ rotulo }}</span>`,
    styles: [`
    .status {
      display: inline-block;
      padding: var(--uz-esp-1) var(--uz-esp-3);
      border-radius: var(--uz-raio-pill);
      font-size: var(--uz-fs-pequeno);
      font-weight: 600;
      white-space: nowrap;
    }
    .status--sucesso { color: var(--uz-sucesso); background: var(--uz-sucesso-fundo); }
    .status--aviso { color: var(--uz-aviso); background: var(--uz-aviso-fundo); }
    .status--erro { color: var(--uz-erro); background: var(--uz-erro-fundo); }
  `],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [NgClass]
})
export class StatusPedidoComponent {
  @Input({ required: true }) status!: StatusPedido;

  get rotulo(): string {
    return STATUS_ROTULO[this.status] ?? this.status;
  }

  get cor(): string {
    return COR[this.status] ?? 'aviso';
  }
}
