import { Subject, of, throwError } from 'rxjs';

import { CategoriaProduto, Pagina, ProdutoResposta } from '../core/api/modelos';
import {
  Resposta, categoriasRelacionadas, destacar, lerRecentes, limparRecentes, montarPainel, salvarRecente, sugestoes,
} from './busca';

function produto(id: number, nome: string, categoria: CategoriaProduto): ProdutoResposta {
  return {
    id, nome, categoria, categoriaNome: categoria, preco: 89.9, descricao: '', ativo: true, disponivel: true,
    criadoEm: '2026-09-25T18:30:00Z', tamanhos: [], fotos: [],
  };
}

function pagina(content: ProdutoResposta[], total = content.length): Pagina<ProdutoResposta> {
  return { content, totalElements: total, totalPages: 1, number: 0, size: 6, first: true, last: true };
}

const LINHO = [produto(11, 'Conjunto Linho Natural', 'CONJUNTOS'), produto(4, 'Blusa Linho Areia', 'BLUSA')];
const rotulos = (r: { opcoes: { rotulo: string }[] }) => r.opcoes.map(o => o.rotulo);

describe('busca', () => {
  describe('destacar', () => {
    it('acha o termo sem acento e mantém o texto original', () => {
      expect(destacar('Calça Wide Leg Caramelo', 'calca')).toEqual(['', 'Calça', ' Wide Leg Caramelo']);
      expect(destacar('Blusa Linho Areia', 'LINHO')).toEqual(['Blusa ', 'Linho', ' Areia']);
    });

    it('sem ocorrência, devolve o nome inteiro', () => {
      expect(destacar('Blusa', 'xyz')).toEqual(['Blusa', '', '']);
    });
  });

  describe('categoriasRelacionadas', () => {
    const nomes = (t: string, p: ProdutoResposta[] = []) =>
      categoriasRelacionadas(t, p).map(x => `${x.categoria.nome}${x.correlata ? '*' : ''}`);

    it('por nome, prefixo e plural', () => {
      expect(nomes('calcas')).toEqual(['Calça']);
      expect(nomes('body preto')).toEqual(['Body']);
      expect(nomes('sa')).toEqual(['Saia']);
    });

    it('correlatas vêm das peças encontradas, na ordem das categorias', () => {
      expect(nomes('linho', LINHO)).toEqual(['Conjuntos*', 'Blusa*']);
    });

    it('palavra de 1 letra não vira prefixo', () => {
      expect(nomes('calça p')).toEqual(['Calça']);
    });
  });

  describe('recentes', () => {
    beforeEach(() => localStorage.clear());

    it('"Calça" e "calca" são a mesma busca; a mais nova vem primeiro; no máximo 5', () => {
      salvarRecente('calca');
      expect(salvarRecente(' Calça ')).toEqual(['Calça']);
      ['a1', 'b2', 'c3', 'd4', 'e5'].forEach(salvarRecente);
      expect(lerRecentes()).toEqual(['e5', 'd4', 'c3', 'b2', 'a1']);
    });

    it('ignora menos de 2 letras, lixo no storage e limpa', () => {
      expect(salvarRecente('x')).toEqual([]);
      localStorage.setItem('uz-buscas-recentes', '{quebrado');
      expect(lerRecentes()).toEqual([]);
      localStorage.setItem('uz-buscas-recentes', JSON.stringify(['linho', 3]));
      expect(lerRecentes()).toEqual(['linho']);
      limparRecentes();
      expect(localStorage.getItem('uz-buscas-recentes')).toBeNull();
    });
  });

  describe('sugestoes', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('espera 300 ms, ignora menos de 2 letras e faz 1 chamada por termo', () => {
      const chamadas: string[] = [];
      const saida: (Resposta | null)[] = [];
      const termos = new Subject<string>();
      sugestoes(termos, q => (chamadas.push(q), of(pagina(LINHO)))).subscribe(r => saida.push(r));

      ['l', 'li', 'lin', 'linh', 'linho'].forEach(t => termos.next(t));
      vi.advanceTimersByTime(299);
      expect(chamadas).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(chamadas).toEqual(['linho']);
      expect(saida).toEqual([{ q: 'linho', pagina: pagina(LINHO), erro: false }]);

      termos.next('linh');
      termos.next('linho'); // voltou ao mesmo termo antes dos 300 ms: nada novo
      vi.advanceTimersByTime(300);
      termos.next('l');
      vi.advanceTimersByTime(300);
      expect(chamadas).toEqual(['linho']);
      expect(saida.at(-1)).toBeNull();
    });

    it('erro vira resposta com erro, e a busca seguinte funciona', () => {
      const saida: (Resposta | null)[] = [];
      const termos = new Subject<string>();
      sugestoes(termos, q => (q === 'ruim' ? throwError(() => new Error('rede')) : of(pagina([])))).subscribe(r => saida.push(r));
      termos.next('ruim');
      vi.advanceTimersByTime(300);
      termos.next('bom');
      vi.advanceTimersByTime(300);
      expect(saida).toEqual([{ q: 'ruim', pagina: null, erro: true }, { q: 'bom', pagina: pagina([]), erro: false }]);
    });
  });

  describe('montarPainel', () => {
    it('inicial: recentes + limpar, 9 categorias e "Ver todas as peças", ids em sequência', () => {
      const p = montarPainel('b', '', null, ['linho']);
      expect(p.grupos.map(g => g.rotulo)).toEqual(['Buscas recentes', 'Categorias']);
      expect(rotulos(p.grupos[0])).toEqual(['linho', 'Limpar buscas recentes']);
      expect(p.grupos[1].opcoes).toHaveLength(9);
      expect(p.grupos[1].opcoes[0]).toMatchObject({ rotulo: 'Calça', rota: ['/loja'], queryParams: { categoria: 'CALCA' } });
      expect(p.final).toMatchObject({ rotulo: 'Ver todas as peças', rota: ['/loja'], queryParams: {} });
      expect(p.opcoes.map(o => o.id)).toEqual(Array.from({ length: 12 }, (_, i) => `b-op-${i}`));
      expect(p.grupos.map(g => g.id)).toEqual(['b-g-0', 'b-g-1']);
      expect(p.anuncio).toBe('');
      expect(montarPainel('b', 'l', null, []).grupos.map(g => g.rotulo)).toEqual(['Categorias']);
    });

    it('com resultado: correlatas, produtos com destaque e "ver todos"', () => {
      const p = montarPainel('b', 'linho', { q: 'linho', pagina: pagina(LINHO), erro: false }, []);
      expect(p.grupos.map(g => g.rotulo)).toEqual(['Categorias', 'Produtos']);
      expect(p.grupos[0].opcoes[0]).toMatchObject({
        rotulo: '“linho” em Conjuntos', queryParams: { categoria: 'CONJUNTOS', q: 'linho' }, grava: 'linho',
      });
      expect(rotulos(p.grupos[0])).toEqual(['“linho” em Conjuntos', '“linho” em Blusa']);
      // 2 letras: só o nome da categoria, com o mesmo filtro.
      const curto = montarPainel('b', 'li', { q: 'li', pagina: pagina(LINHO), erro: false }, []);
      expect(rotulos(curto.grupos[0])).toEqual(['Conjuntos', 'Blusa']);
      expect(curto.grupos[0].opcoes[0].queryParams).toEqual({ categoria: 'CONJUNTOS', q: 'li' });
      expect(p.grupos[1].opcoes[0]).toMatchObject({ rota: ['/produto', '11'], partes: ['Conjunto ', 'Linho', ' Natural'] });
      expect(p.final).toMatchObject({ rotulo: 'Ver todos os 2 resultados para “linho”', queryParams: { q: 'linho' } });
      expect(p.anuncio).toBe('2 peças encontradas. Use as setas para ver as sugestões.');
      expect(p.carregando).toBe(false);

      const um = montarPainel('b', 'blusa', { q: 'blusa', pagina: pagina([LINHO[1]]), erro: false }, []);
      expect(um.final.rotulo).toBe('Ver 1 resultado para “blusa”');
      expect(rotulos(um.grupos[0])).toEqual(['Blusa', 'Blusão']); // nome, depois prefixo; nenhuma correlata
      expect(um.anuncio).toBe('1 peça encontrada. Use as setas para ver as sugestões.');
    });

    it('carregando: produtos anteriores esmaecidos, sem correlatas; 1ª vez com esqueleto', () => {
      const anterior: Resposta = { q: 'linho', pagina: pagina(LINHO), erro: false };
      const p = montarPainel('b', 'blusa linho', anterior, []);
      expect(p.carregando).toBe(true);
      expect(p.grupos.map(g => [g.rotulo, g.esmaecido])).toEqual([['Categorias', false], ['Produtos', true]]);
      expect(rotulos(p.grupos[0])).toEqual(['Blusa', 'Blusão']);
      expect(p.final.rotulo).toBe('Ver resultados para “blusa linho”');
      expect(p.esqueleto).toBe(false);
      expect(p.anuncio).toBe('');
      expect(montarPainel('b', 'xyz', null, []).esqueleto).toBe(true);
    });

    it('sem resultado: mensagem; categorias por nome ou as 9 para explorar', () => {
      const vazio = (q: string) => montarPainel('b', q, { q, pagina: pagina([]), erro: false }, []);
      const body = vazio('body preto');
      expect(body.mensagem).toBe('Nenhuma peça encontrada para “body preto”.');
      expect(body.grupos.map(g => [g.rotulo, rotulos(g)])).toEqual([['Categorias', ['Body']]]);
      const xyz = vazio('xyz');
      expect(xyz.grupos.map(g => [g.rotulo, g.opcoes.length])).toEqual([['Explore as categorias', 9]]);
      expect(xyz.final.rotulo).toBe('Ver todas as peças');
      expect(xyz.anuncio).toBe('Nenhuma peça encontrada para “xyz”.');
    });

    it('erro: mensagem e "Buscar “q” na loja"', () => {
      const p = montarPainel('b', 'linho', { q: 'linho', pagina: null, erro: true }, []);
      expect([p.erro, p.mensagem, p.grupos.length]).toEqual([true, 'Não foi possível buscar as peças agora.', 0]);
      expect(p.final).toMatchObject({ rotulo: 'Buscar “linho” na loja', rota: ['/loja'], queryParams: { q: 'linho' } });
    });
  });
});
