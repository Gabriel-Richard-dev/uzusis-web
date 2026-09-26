import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { Pagina, ProdutoResposta } from '../../core/api/modelos';
import { AvisoService } from '../../core/util/aviso.service';
import { ProdutosComponent } from './produtos.component';

describe('ProdutosComponent', () => {
  let url: BehaviorSubject<ParamMap>;
  let router: { navigate: Mock<Router['navigate']> };
  let catalogo: { listarAdmin: Mock<CatalogoService['listarAdmin']> };

  const pagina = (p: Partial<Pagina<ProdutoResposta>>) =>
    ({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true, ...p });

  function criar(query: Record<string, string>): ProdutosComponent {
    url = new BehaviorSubject(convertToParamMap(query));
    router = { navigate: vi.fn<Router['navigate']>().mockResolvedValue(true) };
    catalogo = { listarAdmin: vi.fn<CatalogoService['listarAdmin']>().mockReturnValue(of(pagina({}))) };
    TestBed.configureTestingModule({
      imports: [ProdutosComponent],
      providers: [
        { provide: CatalogoService, useValue: catalogo },
        { provide: AvisoService, useValue: {} },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap: url } },
      ],
    }).overrideTemplate(ProdutosComponent, '');
    return TestBed.createComponent(ProdutosComponent).componentInstance;
  }

  it('busca de novo um termo igual ao anterior depois de limpar os filtros', fakeAsync(() => {
    const c = criar({});
    c.busca.setValue('saia');
    tick(300);
    url.next(convertToParamMap({ q: 'saia' }));
    url.next(convertToParamMap({})); // "Limpar filtros" ou voltar no navegador
    c.busca.setValue('saia');
    tick(300);
    expect(router.navigate).toHaveBeenCalledTimes(2);
    expect(router.navigate.mock.lastCall?.[1]?.queryParams).toEqual({ q: 'saia', pagina: null });
  }));

  it('página que ficou vazia depois de desativar vai para a última que existe', () => {
    const c = criar({ situacao: 'ativo', pagina: '3' });
    expect(router.navigate).not.toHaveBeenCalled();
    catalogo.listarAdmin.mockReturnValue(of(pagina({ number: 2, totalPages: 2, totalElements: 40 })));
    c.carregar();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], expect.objectContaining({
      queryParams: { pagina: 2 },
      replaceUrl: true,
    }));
  });
});
