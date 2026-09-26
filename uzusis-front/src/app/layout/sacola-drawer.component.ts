import { Component, inject } from '@angular/core';
import { combineLatest, finalize } from 'rxjs';

import { ItemResposta } from '../core/api/modelos';
import { SacolaService } from '../core/api/sacola.service';
import { AuthService } from '../core/auth/auth.service';
import { AvisoService } from '../core/util/aviso.service';

@Component({
  selector: 'uz-sacola-drawer',
  templateUrl: './sacola-drawer.component.html',
  styleUrls: ['./sacola-drawer.component.scss'],
})
export class SacolaDrawerComponent {
  readonly auth = inject(AuthService);
  readonly sacola = inject(SacolaService);
  private readonly aviso = inject(AvisoService);

  readonly vm$ = combineLatest({
    logado: this.auth.logado$,
    carrinho: this.sacola.carrinho$,
    carregando: this.sacola.carregando$,
    erro: this.sacola.erro$,
  });

  /** Itens com requisição em voo (controles desabilitados). */
  readonly ocupados = new Set<number>();
  /** Texto do aria-live="polite". */
  anuncio = '';

  alterar(item: ItemResposta, quantidade: number): void {
    this.ocupados.add(item.id);
    this.sacola
      .alterar(item.id, quantidade)
      .pipe(finalize(() => this.ocupados.delete(item.id)))
      .subscribe({
        next: () => (this.anuncio = `${item.nomeProduto}, tamanho ${item.sigla}: quantidade ${quantidade}`),
        error: err => this.aviso.erro(err),
      });
  }

  remover(item: ItemResposta): void {
    this.ocupados.add(item.id);
    this.sacola
      .remover(item.id)
      .pipe(finalize(() => this.ocupados.delete(item.id)))
      .subscribe({
        next: () => (this.anuncio = `${item.nomeProduto}, tamanho ${item.sigla}, removido da sacola`),
        error: err => this.aviso.erro(err),
      });
  }

  porId(_: number, item: ItemResposta): number {
    return item.id;
  }
}
