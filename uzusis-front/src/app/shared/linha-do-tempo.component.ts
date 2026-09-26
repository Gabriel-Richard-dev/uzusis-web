import { Component, Input, OnChanges, ChangeDetectionStrategy } from '@angular/core';

import { PedidoResposta, StatusPedido } from '../core/api/modelos';
import { IconeComponent } from './icone.component';
import { DatePipe } from '@angular/common';

interface Etapa {
  rotulo: string;
  data: string | null;
  feita: boolean;
  atual: boolean;
  cancelada?: boolean;
  detalhe?: string | null;
}

const FLUXO: { status: StatusPedido; rotulo: string; data: (p: PedidoResposta) => string | null }[] = [
  { status: 'CRIADO', rotulo: 'Pedido realizado', data: p => p.criadoEm },
  { status: 'PAGO', rotulo: 'Pagamento confirmado', data: p => p.pagoEm },
  { status: 'ENVIADO', rotulo: 'Enviado', data: p => p.enviadoEm },
  { status: 'RECEBIDO', rotulo: 'Recebido', data: p => p.recebidoEm },
];

export function montarEtapas(p: PedidoResposta): Etapa[] {
  if (p.status === 'CANCELADO') {
    const feitas = FLUXO.filter(f => f.data(p)).map(f => ({ rotulo: f.rotulo, data: f.data(p), feita: true, atual: false }));
    return [...feitas, { rotulo: 'Cancelado', data: p.canceladoEm, feita: true, atual: true, cancelada: true, detalhe: p.motivoCancelamento }];
  }
  const atual = FLUXO.findIndex(f => f.status === p.status);
  return FLUXO.map((f, i) => ({ rotulo: f.rotulo, data: f.data(p), feita: i <= atual, atual: i === atual }));
}

/** CRIADO → PAGO → ENVIADO → RECEBIDO, ou o ramo cancelado (com motivo e data) destacado. */
@Component({
  selector: 'uz-linha-do-tempo',
  template: `
    <ol class="m-0 list-none p-0">
      @for (e of etapas; track e) {
        <li
          class="relative flex gap-3 pb-4 not-last:before:absolute not-last:before:top-6 not-last:before:bottom-0 not-last:before:left-[0.6875rem] not-last:before:w-0.5 not-last:before:bg-border"
          [class]="e.cancelada ? 'text-destructive' : e.feita ? 'text-foreground' : 'text-muted-foreground'"
          [attr.aria-current]="e.atual ? 'step' : null"
        >
          <span
            class="inline-flex size-6 flex-none items-center justify-center rounded-full border-2"
            [class]="
              e.cancelada
                ? 'border-destructive bg-destructive text-brand-foreground'
                : e.feita
                  ? 'border-brand bg-brand text-brand-foreground'
                  : 'border-input bg-card'
            "
            aria-hidden="true"
          >
            @if (e.feita) {
              <uz-icone [nome]="e.cancelada ? 'fechar' : 'check'" [tamanho]="14"></uz-icone>
            }
          </span>
          <span class="flex flex-col">
            <span class="font-semibold">
              {{ e.rotulo }}@if (!e.feita) {
                <span class="sr-only"> (pendente)</span>
              }
            </span>
            @if (e.data) {
              <span class="text-sm text-muted-foreground">{{ e.data | date: 'dd/MM/yyyy HH:mm' }}</span>
            }
            @if (e.detalhe) {
              <span class="text-sm" [class]="e.cancelada ? 'text-destructive' : 'text-muted-foreground'">{{ e.detalhe }}</span>
            }
          </span>
        </li>
      }
    </ol>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [IconeComponent, DatePipe],
})
export class LinhaDoTempoComponent implements OnChanges {
  @Input({ required: true }) pedido!: PedidoResposta;
  etapas: Etapa[] = [];

  ngOnChanges(): void {
    this.etapas = montarEtapas(this.pedido);
  }
}
