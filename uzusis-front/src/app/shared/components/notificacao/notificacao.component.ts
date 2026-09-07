import { Component, HostListener } from '@angular/core';
import { NotificacaoService } from '../../../core/service/notificacao.service';

@Component({
  selector: 'app-notificacao',
  templateUrl: './notificacao.component.html',
  styleUrls: ['./notificacao.component.scss']
})
export class NotificacaoComponent {
  toasts$ = this.notificacao.toasts$;
  dialogo$ = this.notificacao.dialogo$;

  constructor(private notificacao: NotificacaoService) {}

  fecharToast(id: number) {
    this.notificacao.fecharToast(id);
  }

  @HostListener('document:keydown.escape')
  aoApertarEsc() {
    this.notificacao.cancelarDialogo();
  }
}
