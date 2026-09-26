import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, Observable, catchError, defer, exhaustMap, retry, takeUntil, takeWhile, tap, throwError, timer } from 'rxjs';

import { PedidoResposta } from '../../core/api/modelos';

/** P2 dá 404 "Cobrança ainda não criada" até o payment consumir o order.created: repete a cada 1 s, por até 20 s. */
export function repetirEnquanto404<T>(intervaloMs = 1000, tentativas = 20) {
  return retry<T>({
    count: tentativas,
    delay: err => (err instanceof HttpErrorResponse && err.status === 404 ? timer(intervaloMs) : throwError(() => err)),
  });
}

/**
 * O8 a cada `intervaloMs` enquanto o pedido está CRIADO, por até `limiteMs`. Emite cada leitura e completa quando
 * o status sai de CRIADO ou o prazo acaba. Só a 1ª leitura propaga erro; uma falha depois espera o próximo ciclo.
 */
export function acompanharPedido(
  obter: () => Observable<PedidoResposta>,
  intervaloMs = 2000,
  limiteMs = 120_000,
): Observable<PedidoResposta> {
  return defer(() => {
    let lido = false;
    return timer(0, intervaloMs).pipe(
      takeUntil(timer(limiteMs)),
      exhaustMap(() =>
        obter().pipe(
          tap(() => (lido = true)),
          catchError(err => (lido ? EMPTY : throwError(() => err))),
        ),
      ),
      takeWhile(p => p.status === 'CRIADO', true),
    );
  });
}

const CHAVE_RECUSADOS = 'uz-pedidos-recusados';

function recusados(): number[] {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_RECUSADOS) ?? '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/**
 * D4: depois de uma recusa o mesmo intent nunca é confirmado de novo, nem voltando para /checkout?pedido=id
 * antes de o webhook cancelar o pedido.
 */
export function marcarRecusado(id: number): void {
  try {
    localStorage.setItem(CHAVE_RECUSADOS, JSON.stringify([...recusados(), id]));
  } catch {
    // Sem storage (aba privada, bloqueio): fica só a navegação para /pedido/:id.
  }
}

export function foiRecusado(id: number): boolean {
  return recusados().includes(id);
}
