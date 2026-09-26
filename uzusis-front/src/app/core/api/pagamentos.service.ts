import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ClientSecretResposta, ConfigPagamento } from './modelos';

@Injectable({ providedIn: 'root' })
export class PagamentosService {
  private readonly http = inject(HttpClient);

  /** P1 (público): a publishable key vem só daqui, nunca do build. */
  config(): Observable<ConfigPagamento> {
    return this.http.get<ConfigPagamento>('/api/pagamentos/config');
  }

  /** P2 (dono): 404 "Cobrança ainda não criada" → repetir; 409 → pedido pago ou cancelado. */
  clientSecret(pedidoId: number): Observable<ClientSecretResposta> {
    return this.http.get<ClientSecretResposta>(`/api/pagamentos/${pedidoId}/client-secret`);
  }
}
