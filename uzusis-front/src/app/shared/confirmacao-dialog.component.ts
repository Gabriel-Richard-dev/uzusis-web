import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DadosConfirmacao {
  titulo: string;
  texto: string;
  rotuloOk: string;
}

/** Aberto só pelo AvisoService.confirmar. */
@Component({
  selector: 'uz-confirmacao-dialog',
  template: `
    <h2 mat-dialog-title>{{ dados.titulo }}</h2>
    <mat-dialog-content>
      <p>{{ dados.texto }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [mat-dialog-close]="true">{{ dados.rotuloOk }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmacaoDialogComponent {
  readonly dados = inject<DadosConfirmacao>(MAT_DIALOG_DATA);
}
