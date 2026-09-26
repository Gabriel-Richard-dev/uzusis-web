import { convertToParamMap } from '@angular/router';

import { ProdutoResposta, TamanhoResposta } from '../../core/api/modelos';
import { acrescentar, capasPorCategoria, lerFiltro, sortDe, tamanhoInicial, ultimasUnidades } from './vitrine';

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

  it('ultimasUnidades só com o estoque total da peça entre 1 e 3', () => {
    expect(ultimasUnidades(produto(1, [{ quantidade: 0 }, { quantidade: 3 }]))).toBe(true);
    expect(ultimasUnidades(produto(1, [{ quantidade: 1 }]))).toBe(true);
    expect(ultimasUnidades(produto(1, [{ quantidade: 1 }, { quantidade: 2 }]))).toBe(true);
    expect(ultimasUnidades(produto(1, [{ quantidade: 2 }, { quantidade: 4 }]))).toBe(false); // algum tamanho baixo não basta
    expect(ultimasUnidades(produto(1, [{ quantidade: 2 }, { quantidade: 2 }]))).toBe(false);
    expect(ultimasUnidades(produto(1, [{ quantidade: 0 }, { quantidade: 0 }]))).toBe(false); // esgotado
    expect(ultimasUnidades(produto(1))).toBe(false);
  });

  it('tamanhoInicial só aceita tamanho existente e com estoque', () => {
    const p = produto(1, [{ sigla: 'P', quantidade: 0 }, { sigla: 'M', quantidade: 2 }]);
    expect(tamanhoInicial(p, 'm')).toBe('M');
    expect(tamanhoInicial(p, 'P')).toBeNull();
    expect(tamanhoInicial(p, 'GG')).toBeNull();
    expect(tamanhoInicial(p, null)).toBeNull();
  });

  it('capasPorCategoria fica com a 1ª peça com foto de cada categoria', () => {
    const foto = (url: string) => [{ id: 1, url, ordem: 0 }];
    const capas = capasPorCategoria([
      { ...produto(1), categoria: 'SAIA' },
      { ...produto(2), categoria: 'SAIA', fotos: foto('saia-nova') },
      { ...produto(3), categoria: 'SAIA', fotos: foto('saia-velha') },
      { ...produto(4), fotos: foto('blusa') },
    ]);
    expect([...capas]).toEqual([['SAIA', 'saia-nova'], ['BLUSA', 'blusa']]);
  });
});
