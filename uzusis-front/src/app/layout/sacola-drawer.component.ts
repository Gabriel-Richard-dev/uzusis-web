import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { combineLatest, finalize } from 'rxjs';

import { ItemResposta } from '../core/api/modelos';
import { SacolaService } from '../core/api/sacola.service';
import { AuthService } from '../core/auth/auth.service';
import { AvisoService } from '../core/util/aviso.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { IconeComponent } from '../shared/icone.component';
import { EstadoComponent } from '../shared/estado.component';
import { RouterLink } from '@angular/router';
import { QtdComponent } from '../shared/qtd.component';
import { AsyncPipe, CurrencyPipe } from '@angular/common';

@Component({
    selector: 'uz-sacola-drawer',
    templateUrl: './sacola-drawer.component.html',
    // Coluna que ocupa o sheet: cabeçalho, lista rolável e rodapé fixo embaixo.
    host: { class: 'flex min-h-0 flex-1 flex-col' },
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [HlmButtonImports, HlmSheetImports, IconeComponent, EstadoComponent, RouterLink, QtdComponent, AsyncPipe, CurrencyPipe]
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
}
