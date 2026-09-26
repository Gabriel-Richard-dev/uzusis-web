import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

export interface DadosConfirmacao {
  titulo: string;
  texto: string;
  rotuloOk: string;
}

/** Aberto só pelo AvisoService.confirmar (role="alertdialog"; título e texto dão o nome e a descrição). */
@Component({
  selector: 'uz-confirmacao-dialog',
  template: `
    <div hlmDialogHeader>
      <h2 hlmDialogTitle>{{ dados.titulo }}</h2>
      <!-- id fixo + ariaDescribedBy no open() (AvisoService): o hlmDialogDescription muda o aria-describedby do
           contêiner depois da checagem e o modo dev acusa NG0100. -->
      <p id="uz-confirmacao-texto" class="text-base text-muted-foreground">{{ dados.texto }}</p>
    </div>
    <div hlmDialogFooter>
      <button hlmBtn variant="outline" type="button" (click)="ref.close(false)">Cancelar</button>
      <button hlmBtn type="button" (click)="ref.close(true)">{{ dados.rotuloOk }}</button>
    </div>
  `,
  // contents: cabeçalho e rodapé viram itens da grade do hlm-dialog-content (gap-6).
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, HlmDialogImports],
})
export class ConfirmacaoDialogComponent {
  readonly dados = injectBrnDialogContext<DadosConfirmacao>();
  readonly ref = inject<BrnDialogRef<boolean>>(BrnDialogRef);
}
