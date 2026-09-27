import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

export interface EnderecoCep {
  rua: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface RespostaViaCep {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  private readonly http = inject(HttpClient);

  /** ViaCEP (sem token; o interceptor não toca em URL fora de /api). null = CEP inválido, inexistente ou ViaCEP fora. */
  buscar(cep: string): Observable<EnderecoCep | null> {
    const digitos = cep.replace(/\D/g, '');
    if (digitos.length !== 8) return of(null);
    return this.http.get<RespostaViaCep>(`https://viacep.com.br/ws/${digitos}/json/`).pipe(
      map(r => (r.erro ? null : {
        rua: r.logradouro ?? '',
        bairro: r.bairro ?? '',
        cidade: r.localidade ?? '',
        uf: r.uf ?? '',
      })),
      catchError(() => of(null)),
    );
  }
}
