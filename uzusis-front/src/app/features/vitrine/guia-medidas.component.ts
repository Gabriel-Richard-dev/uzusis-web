import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmTableImports } from '@spartan-ng/helm/table';

// Medidas do corpo em cm (§7.3), iguais para todas as categorias.
const MEDIDAS = [
  { sigla: 'PP', busto: '80–84', cintura: '60–64', quadril: '86–90' },
  { sigla: 'P', busto: '84–88', cintura: '64–68', quadril: '90–94' },
  { sigla: 'M', busto: '88–92', cintura: '68–72', quadril: '94–98' },
  { sigla: 'G', busto: '92–98', cintura: '72–78', quadril: '98–104' },
  { sigla: 'GG', busto: '98–104', cintura: '78–84', quadril: '104–110' },
];

/** id do texto de apoio; quem abre passa em ariaDescribedBy (o hlmDialogDescription dá NG0100). */
export const GUIA_MEDIDAS_DESCRICAO = 'uz-guia-medidas-texto';

/** Aberto pelo HlmDialogService (produto). */
@Component({
  selector: 'uz-guia-medidas',
  template: `
    <div hlmDialogHeader class="pe-10">
      <h2 hlmDialogTitle>Guia de medidas</h2>
      <p [id]="descricao" class="text-muted-foreground">Medidas do corpo, em centímetros.</p>
    </div>
    <div hlmTableContainer>
      <table hlmTable>
        <caption class="sr-only">Medidas do corpo, em centímetros</caption>
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh scope="col">Tamanho</th>
            <th hlmTh scope="col">Busto</th>
            <th hlmTh scope="col">Cintura</th>
            <th hlmTh scope="col">Quadril</th>
          </tr>
        </thead>
        <tbody hlmTBody>
          @for (m of medidas; track m.sigla) {
            <tr hlmTr>
              <th hlmTh scope="row">{{ m.sigla }}</th>
              <td hlmTd class="tabular-nums">{{ m.busto }}</td>
              <td hlmTd class="tabular-nums">{{ m.cintura }}</td>
              <td hlmTd class="tabular-nums">{{ m.quadril }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div hlmDialogFooter>
      <button hlmBtn type="button" hlmDialogClose>Fechar</button>
    </div>
  `,
  // contents: cabeçalho, tabela e rodapé viram itens da grade do hlm-dialog-content (gap-6).
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, HlmDialogImports, HlmTableImports],
})
export class GuiaMedidasComponent {
  readonly medidas = MEDIDAS;
  readonly descricao = GUIA_MEDIDAS_DESCRICAO;
}
