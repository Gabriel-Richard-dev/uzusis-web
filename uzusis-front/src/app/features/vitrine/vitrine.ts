import { ParamMap } from '@angular/router';

import { CATEGORIAS, CategoriaProduto, ProdutoResposta, Sigla } from '../../core/api/modelos';

/** ?ordem= da loja → sort do C1. A primeira é o padrão. */
export const ORDENS = [
  { valor: 'recentes', nome: 'Mais recentes', sort: 'criadoEm,desc' },
  { valor: 'menor-preco', nome: 'Menor preço', sort: 'preco,asc' },
  { valor: 'maior-preco', nome: 'Maior preço', sort: 'preco,desc' },
] as const;

export type Ordem = (typeof ORDENS)[number]['valor'];

export interface FiltroLoja {
  categoria: CategoriaProduto | null;
  q: string;
  ordem: Ordem;
}

/** Estado da loja a partir da URL. Categoria ou ordem desconhecida vira o padrão (o C1 daria 400). */
export function lerFiltro(params: ParamMap): FiltroLoja {
  const categoria = params.get('categoria')?.toUpperCase();
  return {
    categoria: CATEGORIAS.find(c => c.valor === categoria)?.valor ?? null,
    q: (params.get('q') ?? '').trim(),
    ordem: ORDENS.find(o => o.valor === params.get('ordem'))?.valor ?? 'recentes',
  };
}

export function sortDe(ordem: Ordem): string {
  return (ORDENS.find(o => o.valor === ordem) ?? ORDENS[0]).sort;
}

/** "Carregar mais": acrescenta sem repetir. Um produto novo entre as páginas desloca a ordem por criadoEm. */
export function acrescentar(atuais: ProdutoResposta[], novos: ProdutoResposta[]): ProdutoResposta[] {
  const ids = new Set(atuais.map(p => p.id));
  return [...atuais, ...novos.filter(p => !ids.has(p.id))];
}

/** Selo "Últimas unidades": a peça tem de 1 a 3 unidades disponíveis, somando os tamanhos. */
export function ultimasUnidades(produto: ProdutoResposta): boolean {
  const total = produto.tamanhos.reduce((soma, t) => soma + t.quantidade, 0);
  return total >= 1 && total <= 3;
}

/** ?tamanho= (volta do login) só vale se o produto tem o tamanho e ele tem estoque. */
export function tamanhoInicial(produto: ProdutoResposta, sigla: string | null): Sigla | null {
  const tamanho = produto.tamanhos.find(t => t.sigla === sigla?.toUpperCase());
  return tamanho && tamanho.quantidade > 0 ? tamanho.sigla : null;
}

/** Capa de cada categoria: 1ª foto da peça mais nova que tenha foto (a lista vem em criadoEm,desc). */
export function capasPorCategoria(produtos: ProdutoResposta[]): Map<CategoriaProduto, string> {
  const capas = new Map<CategoriaProduto, string>();
  for (const p of produtos) if (p.fotos[0] && !capas.has(p.categoria)) capas.set(p.categoria, p.fotos[0].url);
  return capas;
}
