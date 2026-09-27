import { HttpParams } from '@angular/common/http';

/** Query string de um filtro: ignora null, undefined e ''; array vira parâmetro repetido (status=PAGO&status=ENVIADO). */
export function paramsDe(filtro: object): HttpParams {
  let params = new HttpParams();
  for (const [chave, valor] of Object.entries(filtro)) {
    if (valor === null || valor === undefined || valor === '') continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) {
      params = params.append(chave, String(v));
    }
  }
  return params;
}
