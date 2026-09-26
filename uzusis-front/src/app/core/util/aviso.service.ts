import { Injectable, NgZone, inject } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Observable, take } from 'rxjs';

import { ConfirmacaoDialogComponent, DadosConfirmacao } from '../../shared/confirmacao-dialog.component';
import { mensagemDeErro } from '../api/erros';

/** Avisos (toast do <hlm-toaster>, anunciado por aria-live) e confirmação (alertdialog). */
@Injectable({ providedIn: 'root' })
export class AvisoService {
  private readonly dialog = inject(HlmDialogService);
  private readonly zona = inject(NgZone);

  sucesso(mensagem: string): void {
    toast.success(mensagem, { duration: 5000 });
  }

  /** Aceita um texto pronto ou qualquer erro (HttpErrorResponse → mensagemDeErro). important = aria-live assertive. */
  erro(err: unknown): void {
    const mensagem = typeof err === 'string' ? err : mensagemDeErro(err);
    toast.error(mensagem, {
      duration: 8000,
      important: true,
      style: { '--normal-bg': 'var(--destructive-muted)', '--normal-text': 'var(--destructive)' },
    });
  }

  /** Emite true só se o usuário confirmar; Esc, fora do diálogo e "Cancelar" dão false. */
  confirmar(titulo: string, texto: string, rotuloOk = 'Confirmar'): Observable<boolean> {
    const context: DadosConfirmacao = { titulo, texto, rotuloOk };
    const ref = this.dialog.open<boolean>(ConfirmacaoDialogComponent, {
      context,
      role: 'alertdialog',
      ariaDescribedBy: 'uz-confirmacao-texto',
      showCloseButton: false,
      contentClass: 'sm:max-w-md',
    });
    // O brain fecha num afterNextRender (fora da zona): sem voltar à zona, o que o chamador encadeia (HTTP,
    // atribuições) roda sem change detection e a tela só atualiza na próxima interação.
    return new Observable<boolean>(assinante =>
      ref.closed$.pipe(take(1)).subscribe(resposta =>
        this.zona.run(() => {
          assinante.next(resposta === true);
          assinante.complete();
        }),
      ),
    );
  }
}
