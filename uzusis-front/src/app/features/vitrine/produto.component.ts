import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { ProdutoResposta, Sigla } from '../../core/api/modelos';
import { SacolaService } from '../../core/api/sacola.service';
import { AuthService } from '../../core/auth/auth.service';
import { AvisoService } from '../../core/util/aviso.service';
import { GuiaMedidasComponent } from './guia-medidas.component';
import { tamanhoInicial } from './vitrine';

const MAX_QTD = 10;

@Component({
  selector: 'uz-produto',
  templateUrl: './produto.component.html',
  styleUrls: ['./produto.component.scss'],
})
export class ProdutoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogo = inject(CatalogoService);
  private readonly sacola = inject(SacolaService);
  private readonly auth = inject(AuthService);
  private readonly aviso = inject(AvisoService);
  private readonly title = inject(Title);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private pedido?: Subscription;

  readonly mensagemDeErro = mensagemDeErro;
  produto: ProdutoResposta | null = null;
  naoEncontrado = false;
  erro: unknown = null;
  tamanho: Sigla | null = null;
  quantidade = 1;
  adicionando = false;
  erroAdicionar: string | null = null;

  constructor() {
    // O componente é reaproveitado ao ir de um produto a outro: cada :id recarrega.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => this.carregar());
  }

  get estoque(): number {
    return this.produto?.tamanhos.find(t => t.sigla === this.tamanho)?.quantidade ?? 0;
  }

  get maxQtd(): number {
    return Math.max(1, Math.min(this.estoque, MAX_QTD));
  }

  carregar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.pedido?.unsubscribe();
    this.produto = null;
    this.erro = null;
    this.naoEncontrado = false;
    this.erroAdicionar = null;
    if (!Number.isInteger(id) || id <= 0) {
      this.marcarNaoEncontrado();
      return;
    }
    this.pedido = this.catalogo
      .obter(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: p => {
          this.produto = p;
          this.title.setTitle(`${p.nome} — Uzusis`);
          this.tamanho = tamanhoInicial(p, this.route.snapshot.queryParamMap.get('tamanho'));
          this.quantidade = 1;
        },
        error: (e: unknown) => {
          if (e instanceof HttpErrorResponse && e.status === 404) this.marcarNaoEncontrado();
          else this.erro = e;
        },
      });
  }

  escolherTamanho(sigla: Sigla): void {
    this.tamanho = sigla;
    this.quantidade = Math.min(this.quantidade, this.maxQtd);
    this.erroAdicionar = null;
  }

  abrirGuia(): void {
    this.dialog.open(GuiaMedidasComponent, { width: '32rem', maxWidth: 'calc(100vw - 2rem)' });
  }

  async adicionar(): Promise<void> {
    const produto = this.produto;
    const sigla = this.tamanho;
    if (!produto || !sigla || this.adicionando) return;
    this.adicionando = true;
    this.erroAdicionar = null;
    if (!(await this.auth.sessaoValida())) {
      this.adicionando = false;
      // Volta do Keycloak com o tamanho escolhido já marcado.
      this.auth.login(`/produto/${produto.id}?tamanho=${sigla}`);
      return;
    }
    this.sacola.adicionar(produto.id, sigla, this.quantidade).subscribe({
      next: () => {
        this.adicionando = false;
        this.sacola.abrir();
        this.aviso.sucesso(`${produto.nome} (${sigla}) foi para a sacola`);
      },
      error: e => {
        this.adicionando = false;
        this.erroAdicionar = mensagemDeErro(e);
      },
    });
  }

  private marcarNaoEncontrado(): void {
    this.naoEncontrado = true;
    this.title.setTitle('Produto não encontrado — Uzusis');
  }
}
