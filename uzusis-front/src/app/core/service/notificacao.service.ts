import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TipoNotificacao = 'sucesso' | 'erro' | 'aviso';

export interface Toast {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  texto?: string;
}

export interface Dialogo {
  tipo: TipoNotificacao;
  titulo: string;
  texto?: string;
  confirmar: string;
  cancelar?: string;
  responder: (valor: boolean) => void;
}

export interface OpcoesConfirmar {
  titulo: string;
  texto?: string;
  tipo?: TipoNotificacao;
  confirmar?: string;
  cancelar?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private sequencia = 0;

  private _toasts = new BehaviorSubject<Toast[]>([]);
  toasts$ = this._toasts.asObservable();

  private _dialogo = new BehaviorSubject<Dialogo | null>(null);
  dialogo$ = this._dialogo.asObservable();

  sucesso(titulo: string, texto?: string) { this.toast('sucesso', titulo, texto); }
  erro(titulo: string, texto?: string) { this.toast('erro', titulo, texto); }
  aviso(titulo: string, texto?: string) { this.toast('aviso', titulo, texto); }

  cancelarDialogo() {
    this._dialogo.value?.responder(false);
  }

  fecharToast(id: number) {
    this._toasts.next(this._toasts.value.filter(t => t.id !== id));
  }

  alerta(titulo: string, texto?: string, tipo: TipoNotificacao = 'sucesso'): Promise<void> {
    return new Promise<void>(resolver => {
      this._dialogo.next({
        tipo, titulo, texto,
        confirmar: 'OK',
        responder: () => { this._dialogo.next(null); resolver(); }
      });
    });
  }

  confirmar(opcoes: OpcoesConfirmar): Promise<boolean> {
    return new Promise<boolean>(resolver => {
      this._dialogo.next({
        tipo: opcoes.tipo ?? 'aviso',
        titulo: opcoes.titulo,
        texto: opcoes.texto,
        confirmar: opcoes.confirmar ?? 'Sim',
        cancelar: opcoes.cancelar ?? 'Não',
        responder: valor => { this._dialogo.next(null); resolver(valor); }
      });
    });
  }

  private toast(tipo: TipoNotificacao, titulo: string, texto?: string, duracao = 3500) {
    const item: Toast = { id: ++this.sequencia, tipo, titulo, texto };
    this._toasts.next([...this._toasts.value, item]);
    setTimeout(() => this.fecharToast(item.id), duracao);
  }
}
