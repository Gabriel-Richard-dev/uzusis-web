import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, defer, of, throwError } from 'rxjs';

import { PedidoResposta, StatusPedido } from '../../core/api/modelos';
import { acompanharPedido, foiRecusado, marcarRecusado, repetirEnquanto404 } from './fluxo';

const erro = (status: number) => throwError(() => new HttpErrorResponse({ status }));
const pedido = (status: StatusPedido) => ({ id: 1, status }) as PedidoResposta;

/** Uma chamada por assinatura, seguindo o roteiro; a última se repete. */
function roteiro<T>(...passos: (() => Observable<T>)[]): { obs: Observable<T>; chamadas: () => number } {
  let n = 0;
  return { obs: defer(() => passos[Math.min(n++, passos.length - 1)]()), chamadas: () => n };
}

describe('repetirEnquanto404', () => {
  it('repete a cada 1 s enquanto dá 404 e entrega a resposta', fakeAsync(() => {
    const { obs, chamadas } = roteiro(() => erro(404), () => erro(404), () => of('ok'));
    let valor = '';
    obs.pipe(repetirEnquanto404()).subscribe(v => (valor = v));
    tick(1999);
    expect(valor).toBe('');
    tick(1);
    expect(valor).toBe('ok');
    expect(chamadas()).toBe(3);
  }));

  it('não repete outros erros (409)', fakeAsync(() => {
    const { obs, chamadas } = roteiro<string>(() => erro(409));
    let status = 0;
    obs.pipe(repetirEnquanto404()).subscribe({ error: e => (status = e.status) });
    tick(5000);
    expect(status).toBe(409);
    expect(chamadas()).toBe(1);
  }));

  it('desiste depois de 20 s de 404', fakeAsync(() => {
    const { obs, chamadas } = roteiro<string>(() => erro(404));
    let status = 0;
    obs.pipe(repetirEnquanto404()).subscribe({ error: e => (status = e.status) });
    tick(20_000);
    expect(status).toBe(404);
    expect(chamadas()).toBe(21);
  }));
});

describe('acompanharPedido', () => {
  it('consulta a cada 2 s enquanto CRIADO e para no novo status', fakeAsync(() => {
    const { obs, chamadas } = roteiro(() => of(pedido('CRIADO')), () => of(pedido('CRIADO')), () => of(pedido('PAGO')));
    const vistos: StatusPedido[] = [];
    let completou = false;
    acompanharPedido(() => obs).subscribe({ next: p => vistos.push(p.status), complete: () => (completou = true) });
    tick(10_000);
    expect(vistos).toEqual(['CRIADO', 'CRIADO', 'PAGO']);
    expect(completou).toBe(true);
    expect(chamadas()).toBe(3);
  }));

  it('completa no prazo mesmo se continuar CRIADO', fakeAsync(() => {
    const { obs, chamadas } = roteiro(() => of(pedido('CRIADO')));
    let completou = false;
    acompanharPedido(() => obs).subscribe({ complete: () => (completou = true) });
    tick(119_999);
    expect(completou).toBe(false);
    tick(1);
    expect(completou).toBe(true);
    expect(chamadas()).toBe(60);
  }));

  it('só a primeira falha vira erro; depois espera o próximo ciclo', fakeAsync(() => {
    let erroInicial: unknown;
    acompanharPedido(() => erro(404)).subscribe({ error: e => (erroInicial = e) });
    tick(0);
    expect(erroInicial).toBeInstanceOf(HttpErrorResponse);

    const { obs } = roteiro(() => of(pedido('CRIADO')), () => erro(502), () => of(pedido('CANCELADO')));
    const vistos: StatusPedido[] = [];
    let falhou = false;
    acompanharPedido(() => obs).subscribe({ next: p => vistos.push(p.status), error: () => (falhou = true) });
    tick(4000);
    expect(falhou).toBe(false);
    expect(vistos).toEqual(['CRIADO', 'CANCELADO']);
  }));
});

describe('pedidos recusados', () => {
  afterEach(() => localStorage.removeItem('uz-pedidos-recusados'));

  it('lembra o pedido recusado', () => {
    expect(foiRecusado(7)).toBe(false);
    marcarRecusado(7);
    expect(foiRecusado(7)).toBe(true);
    expect(foiRecusado(8)).toBe(false);
  });
});
