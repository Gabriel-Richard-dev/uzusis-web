import { convertToParamMap } from '@angular/router';

import { ProdutoResposta, TamanhoResposta } from '../../core/api/modelos';
import { acrescentar, lerFiltro, sortDe, tamanhoInicial, ultimasUnidades } from './vitrine';

function produto(id: number, tamanhos: Partial<TamanhoResposta>[] = []): ProdutoResposta {
  return {
    id,
    nome: `Peça ${id}`,
    preco: 89.9,
    descricao: '',
    categoria: 'BLUSA',
    categoriaNome: 'Blusa',
    ativo: true,
    disponivel: true,
    criadoEm: '2026-09-25T18:30:00Z',
    tamanhos: tamanhos.map((t, i) => ({ id: i + 1, sigla: 'M', quantidade: 0, ...t })),
    fotos: [],
  };
}

describe('vitrine', () => {
  describe('lerFiltro', () => {
    it('lê categoria, busca e ordem da URL', () => {
      const f = lerFiltro(convertToParamMap({ categoria: 'BLUSA', q: ' linho ', ordem: 'menor-preco' }));
      expect(f).toEqual({ categoria: 'BLUSA', q: 'linho', ordem: 'menor-preco' });
      expect(sortDe(f.ordem)).toBe('preco,asc');
    });

    it('aceita categoria em minúsculas', () => {
      expect(lerFiltro(convertToParamMap({ categoria: 'saia' })).categoria).toBe('SAIA');
    });

    it('ignora valores desconhecidos e usa os padrões', () => {
      const f = lerFiltro(convertToParamMap({ categoria: 'VESTIDO', ordem: 'aleatoria' }));
      expect(f).toEqual({ categoria: null, q: '', ordem: 'recentes' });
      expect(sortDe(f.ordem)).toBe('criadoEm,desc');
    });
  });

  it('acrescentar não repete produto já listado', () => {
    const lista = acrescentar([produto(3), produto(2)], [produto(2), produto(1)]);
    expect(lista.map(p => p.id)).toEqual([3, 2, 1]);
  });

  it('ultimasUnidades só com algum tamanho entre 1 e 3', () => {
    expect(ultimasUnidades(produto(1, [{ quantidade: 0 }, { quantidade: 4 }]))).toBeFalse();
    expect(ultimasUnidades(produto(1, [{ quantidade: 0 }, { quantidade: 3 }]))).toBeTrue();
    expect(ultimasUnidades(produto(1, [{ quantidade: 1 }]))).toBeTrue();
  });

  it('tamanhoInicial só aceita tamanho existente e com estoque', () => {
    const p = produto(1, [{ sigla: 'P', quantidade: 0 }, { sigla: 'M', quantidade: 2 }]);
    expect(tamanhoInicial(p, 'm')).toBe('M');
    expect(tamanhoInicial(p, 'P')).toBeNull();
    expect(tamanhoInicial(p, 'GG')).toBeNull();
    expect(tamanhoInicial(p, null)).toBeNull();
  });
});
