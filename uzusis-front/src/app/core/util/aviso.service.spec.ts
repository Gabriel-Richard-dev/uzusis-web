import { NgZone, provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Subject } from 'rxjs';

import { AvisoService } from './aviso.service';

describe('AvisoService.confirmar', () => {
  it('responde dentro da zona mesmo quando o diálogo fecha fora dela', () => {
    const fechou = new Subject<boolean>();
    TestBed.configureTestingModule({
      providers: [
        provideZoneChangeDetection(),
        { provide: HlmDialogService, useValue: { open: () => ({ closed$: fechou }) } },
      ],
    });
    const zona = TestBed.inject(NgZone);
    let resposta: boolean | undefined;
    let naZona = false;
    TestBed.inject(AvisoService)
      .confirmar('Remover foto', 'A foto 1 será apagada.')
      .subscribe(r => {
        resposta = r;
        naZona = NgZone.isInAngularZone();
      });

    zona.runOutsideAngular(() => fechou.next(true));

    expect(resposta).toBe(true);
    expect(naZona).toBe(true);
  });
});
