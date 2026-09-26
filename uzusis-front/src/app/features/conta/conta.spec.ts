import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';

import { PedidoResposta } from '../../core/api/modelos';
import { PedidosService } from '../../core/api/pedidos.service';
import { AvisoService } from '../../core/util/aviso.service';
import { ContaComponent } from './conta.component';
import { PedidosComponent } from './pedidos.component';

@Component({ template: '' })
class Vazio {}

describe('conta', () => {
  it('abas são links e a ativa leva aria-current="page"', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'conta', component: ContaComponent, children: [{ path: 'pedidos', component: Vazio }, { path: 'dados', component: Vazio }] },
        ]),
      ],
    });
    const h = await RouterTestingHarness.create('/conta/dados');
    const atual = h.routeNativeElement!.querySelectorAll('nav[aria-label="Seções da conta"] a[aria-current="page"]');
    expect(atual.length).toBe(1);
    expect(atual[0].textContent?.trim()).toBe('Meus dados');
  });

  it('pedido ENVIADO: card com gancho do e2e, <details> e confirmar recebimento', () => {
    const p = {
      id: 7, status: 'ENVIADO', subtotal: 100, frete: 20, valorTotal: 120, criadoEm: '2026-09-01T10:00:00Z',
      expiraEm: null, pagoEm: '2026-09-01T10:05:00Z', enviadoEm: '2026-09-02T10:00:00Z', recebidoEm: null,
      canceladoEm: null, motivoCancelamento: null, sacolaRestaurada: false, cliente: { nome: 'Ana', email: 'a@x' },
      endereco: { destinatario: 'Ana', cep: '60115-170', rua: 'Rua A', numero: '1', bairro: 'B', cidade: 'C', uf: 'CE' },
      itens: [],
    } as unknown as PedidoResposta;
    TestBed.configureTestingModule({
      imports: [PedidosComponent],
      providers: [
        provideRouter([]),
        { provide: PedidosService, useValue: { listar: () => of([p]) } },
        { provide: AvisoService, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(PedidosComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('article.pedido')?.getAttribute('aria-labelledby')).toBe('pedido-7');
    expect(el.querySelector('#pedido-7')?.tagName).toBe('H2');
    expect(el.querySelector('article.pedido details summary')?.textContent).toContain('Detalhes do pedido #7');
    const botao = [...el.querySelectorAll('button')].find(b => b.textContent?.includes('Confirmar recebimento'));
    expect(botao?.getAttribute('aria-describedby')).toBe('pedido-7');
  });
});
