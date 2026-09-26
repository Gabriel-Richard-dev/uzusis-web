import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map } from 'rxjs';

import { ConfirmacaoDialogComponent, DadosConfirmacao } from '../../shared/confirmacao-dialog.component';
import { mensagemDeErro } from '../api/erros';

/** Avisos (snack bar, anunciado por aria-live) e confirmação (diálogo). */
@Injectable({ providedIn: 'root' })
export class AvisoService {
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  sucesso(mensagem: string): void {
    this.snack.open(mensagem, undefined, { duration: 5000 });
  }

  /** Aceita um texto pronto ou qualquer erro (HttpErrorResponse → mensagemDeErro). */
  erro(err: unknown): void {
    const mensagem = typeof err === 'string' ? err : mensagemDeErro(err);
    this.snack.open(mensagem, undefined, { duration: 8000, panelClass: 'uz-aviso-erro', politeness: 'assertive' });
  }

  /** Emite true só se o usuário confirmar; Esc, fora do diálogo e "Cancelar" dão false. */
  confirmar(titulo: string, texto: string, rotuloOk = 'Confirmar'): Observable<boolean> {
    const data: DadosConfirmacao = { titulo, texto, rotuloOk };
    return this.dialog
      .open(ConfirmacaoDialogComponent, { data, width: '28rem', maxWidth: 'calc(100vw - 2rem)' })
      .afterClosed()
      .pipe(map(resposta => resposta === true));
  }
}
