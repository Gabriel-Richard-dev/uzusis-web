import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, finalize, map, of, shareReplay, tap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { SACOLA_VAZIA, resumirSacola } from '../util/sacola';
import { mensagemDeErro } from './erros';
import { CarrinhoResposta, ItemResposta, Sigla } from './modelos';

/** Estado da sacola (O1–O4) compartilhado pelo header, drawer, produto e checkout. Só chama a API logado. */
@Injectable({ providedIn: 'root' })
export class SacolaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly carrinhoSubj = new BehaviorSubject<CarrinhoResposta>(SACOLA_VAZIA);
  private readonly abertaSubj = new BehaviorSubject(false);
  private readonly carregandoSubj = new BehaviorSubject(false);
  private readonly erroSubj = new BehaviorSubject<string | null>(null);

  readonly carrinho$ = this.carrinhoSubj.asObservable();
  readonly quantidade$ = this.carrinho$.pipe(map(c => c.quantidadeItens));
  readonly aberta$ = this.abertaSubj.asObservable();
  readonly carregando$ = this.carregandoSubj.asObservable();
  /** Mensagem do último carregar() que falhou; null se deu certo. */
  readonly erro$ = this.erroSubj.asObservable();

  constructor() {
    this.auth.logado$.subscribe(logado => {
      if (logado) {
        this.carregar();
      } else {
        this.carrinhoSubj.next(SACOLA_VAZIA);
        this.erroSubj.next(null);
      }
    });
  }

  /** O1. Dispara na hora; o Observable devolvido (opcional) entrega o resultado ou o erro. */
  carregar(): Observable<CarrinhoResposta> {
    if (!this.auth.logado) {
      this.carrinhoSubj.next(SACOLA_VAZIA);
      return of(SACOLA_VAZIA);
    }
    this.carregandoSubj.next(true);
    const carrinho$ = this.http.get<CarrinhoResposta>('/api/carrinho').pipe(
      tap(c => {
        this.carrinhoSubj.next(c);
        this.erroSubj.next(null);
      }),
      finalize(() => this.carregandoSubj.next(false)),
      shareReplay(1),
    );
    carrinho$.subscribe({ error: e => this.erroSubj.next(mensagemDeErro(e)) });
    return carrinho$;
  }

  /**
   * O2: mescla com a linha do mesmo tamanho; no sucesso quem chama abre a sacola, e abrir() recarrega.
   * Erros (422 estoque, 404…) vão para quem chamou.
   */
  adicionar(produtoId: number, sigla: Sigla, quantidade: number): Observable<ItemResposta> {
    return this.http.post<ItemResposta>('/api/carrinho/itens', { produtoId, sigla, quantidade });
  }

  /** O3. */
  alterar(itemId: number, quantidade: number): Observable<ItemResposta> {
    return this.http.put<ItemResposta>(`/api/carrinho/itens/${itemId}`, { quantidade }).pipe(
      tap(item => this.definirItens(this.carrinhoSubj.value.itens.map(i => (i.id === item.id ? item : i)))),
    );
  }

  /** O4. */
  remover(itemId: number): Observable<void> {
    return this.http.delete<void>(`/api/carrinho/itens/${itemId}`).pipe(
      tap(() => this.definirItens(this.carrinhoSubj.value.itens.filter(i => i.id !== itemId))),
    );
  }

  /** Recarrega antes: o servidor pode ter devolvido itens (pedido expirado ou cancelado) desde a última leitura. */
  abrir(): void {
    this.carregar();
    this.abertaSubj.next(true);
  }

  fechar(): void {
    this.abertaSubj.next(false);
  }

  private definirItens(itens: ItemResposta[]): void {
    this.carrinhoSubj.next({ itens, ...resumirSacola(itens) });
  }
}
