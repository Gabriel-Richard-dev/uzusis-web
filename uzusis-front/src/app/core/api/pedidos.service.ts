import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { EnderecoEntrega, FiltroPedidosAdmin, FreteResposta, Pagina, PedidoResposta, ResumoAdmin } from './modelos';
import { paramsDe } from './params';

const BASE = '/api/pedidos';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);

  /** O5: frete por UF (calculado no servidor). */
  frete(uf: string): Observable<FreteResposta> {
    return this.http.get<FreteResposta>(`${BASE}/frete`, { params: { uf } });
  }

  /** O6: cria o pedido a partir da sacola (esvazia a sacola; recarregue o SacolaService depois). */
  criar(endereco: EnderecoEntrega): Observable<PedidoResposta> {
    return this.http.post<PedidoResposta>(BASE, { endereco });
  }

  /** O7: pedidos do próprio cliente, mais recente primeiro. */
  listar(): Observable<PedidoResposta[]> {
    return this.http.get<PedidoResposta[]>(BASE);
  }

  /** O8: dono ou ADMIN; 404 se não for dele. */
  obter(id: number): Observable<PedidoResposta> {
    return this.http.get<PedidoResposta>(`${BASE}/${id}`);
  }

  /** O9: ENVIADO → RECEBIDO. */
  receber(id: number): Observable<PedidoResposta> {
    return this.http.post<PedidoResposta>(`${BASE}/${id}/receber`, null);
  }

  /** O10 (ADMIN): status repetível (PAGO, ENVIADO, RECEBIDO). */
  listarAdmin(filtro: FiltroPedidosAdmin = {}): Observable<Pagina<PedidoResposta>> {
    return this.http.get<Pagina<PedidoResposta>>(`${BASE}/admin`, { params: paramsDe(filtro) });
  }

  /** O11 (ADMIN): PAGO → ENVIADO. */
  enviar(id: number): Observable<PedidoResposta> {
    return this.http.post<PedidoResposta>(`${BASE}/${id}/enviar`, null);
  }

  /** O12 (ADMIN). */
  resumo(): Observable<ResumoAdmin> {
    return this.http.get<ResumoAdmin>(`${BASE}/admin/resumo`);
  }
}
