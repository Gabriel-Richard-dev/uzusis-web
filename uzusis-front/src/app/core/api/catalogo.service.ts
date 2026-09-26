import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AtualizarProduto, Categoria, CriarProduto, FiltroProdutosAdmin, FiltroVitrine, FotoResposta, Pagina,
  ProdutoResposta, TamanhoEntrada,
} from './modelos';
import { paramsDe } from './params';

const BASE = '/api/produtos';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);

  /** C1: vitrine (só ativos com estoque). */
  listar(filtro: FiltroVitrine = {}): Observable<Pagina<ProdutoResposta>> {
    return this.http.get<Pagina<ProdutoResposta>>(BASE, { params: paramsDe(filtro) });
  }

  /** C2: 404 para inexistente, e para inativo quando não é ADMIN. */
  obter(id: number): Observable<ProdutoResposta> {
    return this.http.get<ProdutoResposta>(`${BASE}/${id}`);
  }

  /** C3. A lista é fixa: CATEGORIAS (modelos.ts) evita a requisição. */
  categorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${BASE}/categorias`);
  }

  /** C4 (ADMIN): todos, inclusive inativos e esgotados. */
  listarAdmin(filtro: FiltroProdutosAdmin = {}): Observable<Pagina<ProdutoResposta>> {
    return this.http.get<Pagina<ProdutoResposta>>(`${BASE}/admin`, { params: paramsDe(filtro) });
  }

  /** C6 (ADMIN). */
  criar(dados: CriarProduto): Observable<ProdutoResposta> {
    return this.http.post<ProdutoResposta>(BASE, dados);
  }

  /** C7 (ADMIN). Reativar = atualizar(id, { ativo: true }). */
  atualizar(id: number, dados: AtualizarProduto): Observable<ProdutoResposta> {
    return this.http.put<ProdutoResposta>(`${BASE}/${id}`, dados);
  }

  /** C8 (ADMIN): upsert por sigla, quantidade absoluta; sigla não enviada fica intacta. */
  atualizarEstoque(id: number, tamanhos: TamanhoEntrada[]): Observable<ProdutoResposta> {
    return this.http.put<ProdutoResposta>(`${BASE}/${id}/estoque`, { tamanhos });
  }

  /** C9 (ADMIN): soft delete (ativo=false), idempotente. */
  desativar(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  /** C10 (ADMIN): um arquivo por requisição, na parte 'arquivo'. */
  enviarFoto(id: number, arquivo: File): Observable<FotoResposta> {
    const corpo = new FormData();
    corpo.append('arquivo', arquivo);
    return this.http.post<FotoResposta>(`${BASE}/${id}/fotos`, corpo);
  }

  /** C11 (ADMIN). */
  removerFoto(id: number, fotoId: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}/fotos/${fotoId}`);
  }

  /** C12 (ADMIN): exatamente os ids das fotos do produto, na nova ordem (a primeira é a capa). */
  reordenarFotos(id: number, fotoIds: number[]): Observable<FotoResposta[]> {
    return this.http.put<FotoResposta[]>(`${BASE}/${id}/fotos/ordem`, { fotoIds });
  }
}
