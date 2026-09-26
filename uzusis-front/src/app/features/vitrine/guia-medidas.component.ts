import { Component } from '@angular/core';

// Medidas do corpo em cm (§7.3), iguais para todas as categorias.
const MEDIDAS = [
  { sigla: 'PP', busto: '80–84', cintura: '60–64', quadril: '86–90' },
  { sigla: 'P', busto: '84–88', cintura: '64–68', quadril: '90–94' },
  { sigla: 'M', busto: '88–92', cintura: '68–72', quadril: '94–98' },
  { sigla: 'G', busto: '92–98', cintura: '72–78', quadril: '98–104' },
  { sigla: 'GG', busto: '98–104', cintura: '78–84', quadril: '104–110' },
];

@Component({
  selector: 'uz-guia-medidas',
  template: `
    <h2 mat-dialog-title>Guia de medidas</h2>
    <mat-dialog-content>
      <table class="guia">
        <caption>Medidas do corpo, em centímetros</caption>
        <thead>
          <tr>
            <th scope="col">Tamanho</th>
            <th scope="col">Busto</th>
            <th scope="col">Cintura</th>
            <th scope="col">Quadril</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of medidas">
            <th scope="row">{{ m.sigla }}</th>
            <td>{{ m.busto }}</td>
            <td>{{ m.cintura }}</td>
            <td>{{ m.quadril }}</td>
          </tr>
        </tbody>
      </table>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .guia {
      width: 100%;
      border-collapse: collapse;
      color: var(--uz-tinta);
      font-size: var(--uz-fs-pequeno);
    }
    caption {
      margin-bottom: var(--uz-esp-3);
      color: var(--uz-tinta-suave);
      text-align: left;
    }
    th, td {
      padding: var(--uz-esp-2);
      border-bottom: 1px solid var(--uz-borda);
      text-align: left;
      white-space: nowrap;
    }
    thead th { font-weight: 600; }
    tbody th { font-weight: 600; }
  `],
})
export class GuiaMedidasComponent {
  readonly medidas = MEDIDAS;
}
