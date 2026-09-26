import { Component, ElementRef, Input, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { Observable, catchError, concatMap, filter, finalize, from, map, of, switchMap, tap, toArray } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { mensagemDeErro } from '../../core/api/erros';
import { FotoResposta } from '../../core/api/modelos';
import { AvisoService } from '../../core/util/aviso.service';
import { MAX_FOTOS, erroDoArquivo, trocar } from './admin-util';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { IconeComponent } from '../../shared/icone.component';

/** Arquivo escolhido e ainda não gravado: pendente (criação), enviando ou com erro. */
interface FotoLocal {
  id: number;
  arquivo: File;
  previa: string;
  enviando: boolean;
  erro: string | null;
}

/**
 * Fotos do produto. Criação (produtoId null): guarda os arquivos até o pai chamar enviarPendentes() depois do C6.
 * Edição: envia ao escolher (C10), remove (C11) e reordena pelos botões (C12). A primeira é a capa.
 */
@Component({
    selector: 'uz-gerenciador-fotos',
    templateUrl: './gerenciador-fotos.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [HlmAlertImports, HlmBadgeImports, HlmButtonImports, HlmSpinnerImports, IconeComponent]
})
export class GerenciadorFotosComponent implements OnDestroy {
  @Input() produtoId: number | null = null;
  @Input() fotos: FotoResposta[] = [];

  private readonly catalogo = inject(CatalogoService);
  private readonly aviso = inject(AvisoService);
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;

  readonly max = MAX_FOTOS;
  locais: FotoLocal[] = [];
  recusados: string[] = [];
  anuncio = '';
  ocupado = false;
  private seq = 0;

  get edicao(): boolean {
    return this.produtoId !== null;
  }

  /** O que aparece na grade: as fotos gravadas (edição) ou as escolhidas (criação). */
  get grade(): { chave: string; src: string }[] {
    return this.edicao
      ? this.fotos.map(f => ({ chave: 'f' + f.id, src: f.url }))
      : this.locais.map(l => ({ chave: 'l' + l.id, src: l.previa }));
  }

  get total(): number {
    return (this.edicao ? this.fotos.length : 0) + this.locais.filter(l => !l.erro).length;
  }

  get falhasOuEnvios(): FotoLocal[] {
    return this.edicao ? this.locais : [];
  }

  selecionar(input: HTMLInputElement): void {
    const arquivos = Array.from(input.files ?? []);
    input.value = ''; // permite escolher o mesmo arquivo de novo
    this.recusados = [];
    const aceitos: FotoLocal[] = [];
    for (const arquivo of arquivos) {
      const erro =
        erroDoArquivo(arquivo) ?? (this.total + aceitos.length >= MAX_FOTOS ? 'Limite de 6 fotos por produto.' : null);
      if (erro) {
        this.recusados.push(`${arquivo.name}: ${erro}`);
        continue;
      }
      aceitos.push({ id: ++this.seq, arquivo, previa: URL.createObjectURL(arquivo), enviando: false, erro: null });
    }
    this.locais = [...this.locais, ...aceitos];
    if (this.produtoId !== null && aceitos.length) this.enviar(this.produtoId, aceitos).subscribe();
  }

  /** Depois do C6: envia em sequência as fotos escolhidas na criação. Emite o número de falhas. */
  enviarPendentes(produtoId: number): Observable<number> {
    return this.enviar(produtoId, this.locais.filter(l => !l.erro));
  }

  tentarDeNovo(local: FotoLocal): void {
    if (this.produtoId === null) return;
    local.erro = null;
    this.enviar(this.produtoId, [local]).subscribe();
  }

  dispensar(local: FotoLocal): void {
    URL.revokeObjectURL(local.previa);
    this.locais = this.locais.filter(l => l !== local);
  }

  mover(i: number, delta: -1 | 1): void {
    if (this.ocupado) return;
    const chave = this.grade[i].chave;
    const j = i + delta;
    if (!this.edicao) {
      this.locais = trocar(this.locais, i, j);
      this.depoisDeMover(chave, j, delta);
      return;
    }
    this.ocupado = true;
    this.catalogo
      .reordenarFotos(this.produtoId as number, trocar(this.fotos, i, j).map(f => f.id))
      .pipe(finalize(() => (this.ocupado = false)))
      .subscribe({
        next: fotos => {
          this.fotos = fotos;
          this.depoisDeMover(chave, j, delta);
        },
        error: e => {
          this.aviso.erro(e);
          this.focar(chave, delta);
        },
      });
  }

  remover(i: number): void {
    if (this.ocupado) return;
    if (!this.edicao) {
      this.dispensar(this.locais[i]);
      this.anuncio = 'Foto retirada.';
      this.focarAdicionar();
      return;
    }
    const foto = this.fotos[i];
    this.aviso
      .confirmar('Remover foto', `A foto ${i + 1} será apagada deste produto.`, 'Remover')
      .pipe(
        filter(Boolean),
        tap(() => (this.ocupado = true)),
        switchMap(() => this.catalogo.removerFoto(this.produtoId as number, foto.id)),
        finalize(() => (this.ocupado = false)),
      )
      .subscribe({
        next: () => {
          // O servidor recompacta a ordem 0..n-1; aqui basta tirar da lista.
          this.fotos = this.fotos.filter(f => f.id !== foto.id).map((f, k) => ({ ...f, ordem: k }));
          this.anuncio = 'Foto removida.';
          this.focarAdicionar();
        },
        error: e => this.aviso.erro(e),
      });
  }

  ngOnDestroy(): void {
    this.locais.forEach(l => URL.revokeObjectURL(l.previa));
  }

  private enviar(produtoId: number, itens: FotoLocal[]): Observable<number> {
    let falhas = 0;
    return from(itens).pipe(
      concatMap((item, i) => {
        item.enviando = true;
        this.anuncio = `Enviando foto ${i + 1} de ${itens.length}…`;
        return this.catalogo.enviarFoto(produtoId, item.arquivo).pipe(
          tap(foto => {
            if (!this.fotos.some(f => f.id === foto.id)) this.fotos = [...this.fotos, foto];
            this.dispensar(item);
          }),
          catchError(e => {
            item.enviando = false;
            item.erro = mensagemDeErro(e);
            falhas++;
            return of(null);
          }),
        );
      }),
      toArray(),
      map(() => {
        if (itens.length) this.anuncio = falhas ? `${falhas} de ${itens.length} fotos não foram enviadas.` : 'Fotos enviadas.';
        return falhas;
      }),
    );
  }

  /** Mover reposiciona o nó no DOM e o foco se perde: devolve ao botão da mesma foto. */
  private depoisDeMover(chave: string, j: number, delta: -1 | 1): void {
    this.anuncio = `Foto movida para a posição ${j + 1} de ${this.grade.length}.`;
    this.focar(chave, delta);
  }

  private focar(chave: string, delta: -1 | 1): void {
    setTimeout(() => {
      const botao = (d: number) =>
        this.el.querySelector<HTMLButtonElement>(`#mover-${chave}-${d < 0 ? 'esq' : 'dir'}:not([disabled])`);
      (botao(delta) ?? botao(-delta))?.focus();
    });
  }

  private focarAdicionar(): void {
    setTimeout(() => this.el.querySelector<HTMLElement>('.fotos__adicionar')?.focus());
  }
}
