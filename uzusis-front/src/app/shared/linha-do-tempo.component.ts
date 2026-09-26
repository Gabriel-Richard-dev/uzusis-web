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
    <ol class="linha">
      @for (e of etapas; track e) {
        <li
          class="etapa"
          [class.etapa--feita]="e.feita"
          [class.etapa--cancelada]="e.cancelada"
          [attr.aria-current]="e.atual ? 'step' : null"
          >
          <span class="etapa__marca" aria-hidden="true">
            @if (e.feita) {
              <uz-icone [nome]="e.cancelada ? 'fechar' : 'check'" [tamanho]="14"></uz-icone>
            }
          </span>
          <span class="etapa__texto">
            <span class="etapa__rotulo">
              {{ e.rotulo }}@if (!e.feita) {
              <span class="uz-visualmente-oculto"> (pendente)</span>
            }
          </span>
          @if (e.data) {
            <span class="etapa__data">{{ e.data | date: 'dd/MM/yyyy HH:mm' }}</span>
          }
          @if (e.detalhe) {
            <span class="etapa__detalhe">{{ e.detalhe }}</span>
          }
        </span>
      </li>
    }
    </ol>
    `,
    styles: [`
    .linha {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .etapa {
      position: relative;
      display: flex;
      gap: var(--uz-esp-3);
      padding-bottom: var(--uz-esp-4);
      color: var(--uz-tinta-suave);
    }
    .etapa:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 0.6875rem;
      top: 1.5rem;
      bottom: 0;
      width: 2px;
      background: var(--uz-borda);
    }
    .etapa__marca {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid var(--uz-borda-campo);
      border-radius: 50%;
      background: var(--uz-superficie);
    }
    .etapa--feita {
      color: var(--uz-tinta);
    }
    .etapa--feita .etapa__marca {
      border-color: var(--uz-marca);
      background: var(--uz-marca);
      color: var(--uz-sobre-marca);
    }
    .etapa--cancelada {
      color: var(--uz-erro);
    }
    .etapa--cancelada .etapa__marca {
      border-color: var(--uz-erro);
      background: var(--uz-erro);
    }
    .etapa__texto {
      display: flex;
      flex-direction: column;
    }
    .etapa__rotulo {
      font-weight: 600;
    }
    .etapa__data,
    .etapa__detalhe {
      font-size: var(--uz-fs-pequeno);
      color: var(--uz-tinta-suave);
    }
    .etapa--cancelada .etapa__detalhe {
      color: var(--uz-erro);
    }
  `],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [IconeComponent, DatePipe]
})
export class LinhaDoTempoComponent implements OnChanges {
  @Input({ required: true }) pedido!: PedidoResposta;
  etapas: Etapa[] = [];

  ngOnChanges(): void {
    this.etapas = montarEtapas(this.pedido);
  }
}
