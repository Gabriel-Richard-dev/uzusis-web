import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AtualizarEndereco, AtualizarPerfil, PerfilResposta } from './modelos';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  /** I1: cria o perfil no primeiro acesso. */
  obter(): Observable<PerfilResposta> {
    return this.http.get<PerfilResposta>('/api/perfil');
  }

  /** I2 (upsert): null = mantém. */
  atualizar(dados: AtualizarPerfil): Observable<PerfilResposta> {
    return this.http.put<PerfilResposta>('/api/perfil', dados);
  }

  /** I3 (upsert): null = mantém; complemento '' = limpa. */
  atualizarEndereco(dados: AtualizarEndereco): Observable<PerfilResposta> {
    return this.http.put<PerfilResposta>('/api/perfil/endereco', dados);
  }

  /** I4 (ADMIN). */
  obterPorSub(sub: string): Observable<PerfilResposta> {
    return this.http.get<PerfilResposta>(`/api/perfil/${encodeURIComponent(sub)}`);
  }
}
