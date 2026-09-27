import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { STATUS_ROTULO, StatusPedido } from '../core/api/modelos';

// Contraste do texto sobre o fundo: 5,58 (success) · 5,28 (warning) · 6,13 (destructive).
const COR: Record<StatusPedido, string> = {
  CRIADO: 'bg-warning-muted text-warning',
  PAGO: 'bg-success-muted text-success',
  ENVIADO: 'bg-warning-muted text-warning',
  RECEBIDO: 'bg-success-muted text-success',
  CANCELADO: 'bg-destructive-muted text-destructive',
};

@Component({
  selector: 'uz-status-pedido',
  // Mesmo desenho do hlmBadge, sem a diretiva: a cor muda com o status e não disputa com a variante.
  template: `<span
    class="inline-flex h-6 items-center rounded-full px-2.5 text-sm font-semibold whitespace-nowrap"
    [class]="cor"
    >{{ rotulo }}</span
  >`,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class StatusPedidoComponent {
  @Input({ required: true }) status!: StatusPedido;

  get rotulo(): string {
    return STATUS_ROTULO[this.status] ?? this.status;
  }

  get cor(): string {
    return COR[this.status] ?? COR.CRIADO;
  }
}
