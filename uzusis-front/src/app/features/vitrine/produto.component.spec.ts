import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { of } from 'rxjs';

import { CatalogoService } from '../../core/api/catalogo.service';
import { ProdutoResposta } from '../../core/api/modelos';
import { SacolaService } from '../../core/api/sacola.service';
import { AuthService } from '../../core/auth/auth.service';
import { AvisoService } from '../../core/util/aviso.service';
import { GUIA_MEDIDAS_DESCRICAO } from './guia-medidas.component';
import { ProdutoComponent } from './produto.component';

const PRODUTO: ProdutoResposta = {
  id: 7,
  nome: 'Saia Linho',
  preco: 89.9,
  descricao: 'Linho.',
  categoria: 'SAIA',
  categoriaNome: 'Saia',
  ativo: true,
  disponivel: true,
  criadoEm: '2026-09-25T18:30:00Z',
  tamanhos: [
    { id: 1, sigla: 'P', quantidade: 0 },
    { id: 2, sigla: 'M', quantidade: 2 },
  ],
  fotos: [],
};

describe('ProdutoComponent', () => {
  function criar() {
    const params = convertToParamMap({ id: '7' });
    TestBed.configureTestingModule({
      imports: [ProdutoComponent],
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        { provide: ActivatedRoute, useValue: { paramMap: of(params), snapshot: { paramMap: params, queryParamMap: convertToParamMap({}) } } },
        { provide: CatalogoService, useValue: { obter: () => of(PRODUTO) } },
        { provide: SacolaService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: AvisoService, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(ProdutoComponent);
    f.detectChanges();
    return f;
  }

  it('tamanhos são rádios nativos: esgotado desabilitado e nomeado, escolha habilita o botão', () => {
    const f = criar();
    const el: HTMLElement = f.nativeElement;
    const radios = [...el.querySelectorAll<HTMLInputElement>('[role=radiogroup] input[type=radio]')];
    expect(radios.map(r => [r.getAttribute('aria-label'), r.disabled])).toEqual([['P, esgotado', true], ['M', false]]);
    const adicionar = [...el.querySelectorAll('button')].find(b => b.textContent?.includes('Adicionar à sacola'))!;
    expect(adicionar.disabled).toBe(true);

    radios[1].click();
    f.detectChanges();
    expect(f.componentInstance.tamanho).toBe('M');
    expect(radios[1].checked).toBe(true);
    expect(adicionar.disabled).toBe(false);
    expect(el.textContent).toContain('Restam 2 neste tamanho');
  });

  it('guia de medidas abre em diálogo descrito pelo texto de apoio', () => {
    const f = criar();
    f.componentInstance.abrirGuia();
    TestBed.tick(); // o diálogo é anexado ao ApplicationRef, não ao fixture
    const dialogo = document.querySelector('[role=dialog]')!;
    expect(dialogo.getAttribute('aria-describedby')).toBe(GUIA_MEDIDAS_DESCRICAO);
    expect(document.getElementById(GUIA_MEDIDAS_DESCRICAO)?.textContent).toContain('centímetros');
    expect(dialogo.querySelectorAll('tbody tr')).toHaveLength(5);
  });
});
