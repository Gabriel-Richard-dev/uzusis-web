import { FiltroProdutosAdmin, ProdutoResposta, SIGLAS, Sigla, TamanhoEntrada } from '../../core/api/modelos';

export type Situacao = 'ativo' | 'inativo' | 'sem-estoque';

export const SITUACOES: readonly { valor: Situacao; nome: string }[] = [
  { valor: 'ativo', nome: 'Ativo' },
  { valor: 'inativo', nome: 'Inativo' },
  { valor: 'sem-estoque', nome: 'Sem estoque' },
];

/** ?situacao= da URL → filtro de C4. */
export function filtroDaSituacao(situacao: string | null): Pick<FiltroProdutosAdmin, 'ativo' | 'disponivel'> {
  switch (situacao) {
    case 'ativo':
      return { ativo: true };
    case 'inativo':
      return { ativo: false };
    case 'sem-estoque':
      return { ativo: true, disponivel: false };
    default:
      return {};
  }
}

export function situacaoDo(produto: ProdutoResposta): Situacao {
  if (!produto.ativo) return 'inativo';
  return produto.disponivel ? 'ativo' : 'sem-estoque';
}

/** "59,90", "59.90" ou "59" → 59.9. Qualquer outra coisa (inclusive "1.234,56") → null. */
export function lerPreco(texto: string): number | null {
  const t = texto.trim();
  return /^\d{1,15}([.,]\d{1,2})?$/.test(t) ? Number(t.replace(',', '.')) : null;
}

export function formatarPreco(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

/**
 * Estoque de C6/C8: as siglas que o produto já tem (mesmo zeradas, para poder zerar) e as novas com
 * quantidade > 0, na ordem PP..GG. Campo vazio conta como 0.
 */
export function tamanhosParaEnviar(
  quantidades: Partial<Record<Sigla, number | null>>,
  existentes: readonly Sigla[] = [],
): TamanhoEntrada[] {
  return SIGLAS.filter(s => existentes.includes(s) || (quantidades[s] ?? 0) > 0).map(s => ({
    sigla: s,
    quantidade: quantidades[s] ?? 0,
  }));
}

export const MAX_FOTOS = 6;
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES_FOTO = 5 * 1024 * 1024;

/** Validação no cliente antes do C10 (o servidor confere de novo pelos bytes). */
export function erroDoArquivo(arquivo: File): string | null {
  if (!TIPOS_FOTO.includes(arquivo.type)) return 'Formato não suportado. Envie JPEG, PNG ou WEBP.';
  if (arquivo.size > MAX_BYTES_FOTO) return 'Arquivo maior que 5 MB.';
  return null;
}

/** Cópia da lista com as posições i e j trocadas. */
export function trocar<T>(lista: readonly T[], i: number, j: number): T[] {
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}
