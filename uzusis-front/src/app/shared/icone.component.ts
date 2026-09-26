import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

// Traços 24×24 (stroke), um único path por ícone.
const ICONES = {
  sacola: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  usuario: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  busca: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  menu: 'M3 6h18M3 12h18M3 18h18',
  fechar: 'M18 6 6 18M6 6l12 12',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  lixeira: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  'seta-esquerda': 'M19 12H5M12 19l-7-7 7-7',
  'seta-direita': 'M5 12h14M12 5l7 7-7 7',
  'seta-baixo': 'm6 9 6 6 6-6',
  check: 'M20 6 9 17l-5-5',
  alerta: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4M12 16h.01',
  regua: 'M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0zM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2',
} as const;

export type NomeIcone = keyof typeof ICONES;

/** Ícone SVG inline. Sem rótulo é decorativo (aria-hidden); com rótulo vira role="img". */
@Component({
    selector: 'uz-icone',
    template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      [attr.width]="tamanho"
      [attr.height]="tamanho"
      [attr.aria-hidden]="rotulo ? null : 'true'"
      [attr.role]="rotulo ? 'img' : null"
      [attr.aria-label]="rotulo || null"
    >
      <path [attr.d]="caminho"></path>
    </svg>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [':host { display: inline-flex; line-height: 0; flex: none; }']
})
export class IconeComponent {
  @Input({ required: true }) nome!: NomeIcone;
  @Input() tamanho = 20;
  @Input() rotulo?: string;

  get caminho(): string {
    return ICONES[this.nome] ?? '';
  }
}
