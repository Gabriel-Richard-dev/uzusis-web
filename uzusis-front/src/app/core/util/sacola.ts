import { CarrinhoResposta, ItemResposta } from '../api/modelos';

export const SACOLA_VAZIA: CarrinhoResposta = { itens: [], quantidadeItens: 0, valorTotal: 0 };

/** Totais da sacola como o servidor calcula (O1): soma das quantidades e dos valorTotal, em centavos para não acumular erro. */
export function resumirSacola(itens: readonly Pick<ItemResposta, 'quantidade' | 'valorTotal'>[]): Omit<CarrinhoResposta, 'itens'> {
  let quantidadeItens = 0;
  let centavos = 0;
  for (const item of itens) {
    quantidadeItens += item.quantidade;
    centavos += Math.round(item.valorTotal * 100);
  }
  return { quantidadeItens, valorTotal: centavos / 100 };
}
