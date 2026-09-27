import { Params } from '@angular/router';
import { Observable, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { CATEGORIAS, Categoria, Pagina, ProdutoResposta } from '../core/api/modelos';

/** Minúsculo e sem acento. */
export const normalizar = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
/** Igual, mas 1 unidade por unidade: os índices batem com o texto original. */
const base = (t: string) => t.split('').map(c => c.normalize('NFD')[0].toLowerCase()[0]).join('');

/** 'Calça Wide Leg Caramelo' + 'calca' → ['', 'Calça', ' Wide Leg Caramelo']. O trecho do meio vai em negrito, sem innerHTML. */
export function destacar(nome: string, termo: string): [string, string, string] {
  const q = normalizar(termo);
  const i = q ? base(nome).indexOf(q) : -1;
  return i < 0 ? [nome, '', ''] : [nome.slice(0, i), nome.slice(i, i + q.length), nome.slice(i + q.length)];
}

/** Até 3: nome igual a uma palavra > prefixo (inclui plural) > categoria de uma peça encontrada (correlata). */
export function categoriasRelacionadas(termo: string, produtos: ProdutoResposta[]): { categoria: Categoria; correlata: boolean }[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  const nota = (c: Categoria) => {
    const n = normalizar(c.nome);
    if (palavras.includes(n)) return 0;
    // Palavra de 1 letra ("calça p") não vira prefixo de tudo.
    if (palavras.some(p => p.length > 1 && (n.startsWith(p) || p.startsWith(n)))) return 1;
    return produtos.some(p => p.categoria === c.valor) ? 2 : 3;
  };
  return CATEGORIAS.map(c => ({ c, n: nota(c) }))
    .filter(x => x.n < 3)
    .sort((a, b) => a.n - b.n)
    .slice(0, 3)
    .map(x => ({ categoria: x.c, correlata: x.n === 2 }));
}

// ---- Buscas recentes (só neste navegador) ----

const CHAVE = 'uz-buscas-recentes';

export function lerRecentes(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function salvarRecente(termo: string): string[] {
  const t = termo.trim().slice(0, 100);
  if (t.length < 2) return lerRecentes();
  const lista = [t, ...lerRecentes().filter(r => normalizar(r) !== normalizar(t))].slice(0, 5);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* aba privada: só não lembra */
  }
  return lista;
}

export function limparRecentes(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* idem */
  }
}

// ---- Sugestões ----

/** Resposta da API para o termo q (pagina null = erro). */
export interface Resposta {
  q: string;
  pagina: Pagina<ProdutoResposta> | null;
  erro: boolean;
}

/** Termos (já sem espaços nas pontas) → respostas: espera 300 ms, menos de 2 letras = null, 1 chamada por termo. */
export function sugestoes(
  termos: Observable<string>,
  buscar: (q: string) => Observable<Pagina<ProdutoResposta>>,
): Observable<Resposta | null> {
  return termos.pipe(
    debounceTime(300), // igual à loja
    distinctUntilChanged(),
    switchMap(q =>
      q.length < 2
        ? of(null)
        : buscar(q).pipe(
            map(pagina => ({ q, pagina, erro: false })),
            catchError(() => of({ q, pagina: null, erro: true })),
          ),
    ),
  );
}

export interface Opcao {
  id: string;
  tipo: 'produto' | 'categoria' | 'recente' | 'limpar' | 'ver';
  rotulo: string;
  rota: string[];
  queryParams?: Params;
  /** Termo a guardar nas recentes ao escolher (salvarRecente ignora menos de 2 letras). */
  grava: string;
  produto?: ProdutoResposta;
  /** Nome do produto partido em [antes, termo, depois]. */
  partes?: [string, string, string];
}

export interface Grupo {
  id: string;
  rotulo: string;
  pilulas: boolean;
  /** Produtos do termo anterior enquanto o atual carrega. */
  esmaecido: boolean;
  opcoes: Opcao[];
}

export interface Painel {
  grupos: Grupo[];
  final: Opcao;
  /** grupos + final, na ordem das setas. */
  opcoes: Opcao[];
  /** Vazio ou erro; fica fora do listbox. */
  mensagem: string;
  erro: boolean;
  esqueleto: boolean;
  carregando: boolean;
  /** Texto do role=status: só com a resposta do termo atual. */
  anuncio: string;
}

/** Conteúdo do popup (tabela B.5 da spec). Ids: `${prefixo}-op-N` e `${prefixo}-g-N`. */
export function montarPainel(prefixo: string, q: string, r: Resposta | null, recentes: string[]): Painel {
  const atual = q.length >= 2 && r?.q === q ? r : null;
  const carregando = q.length >= 2 && !atual;
  const grupos: Omit<Grupo, 'id'>[] = [];
  const op = (tipo: Opcao['tipo'], rotulo: string, rota: string[], queryParams?: Params, extra?: Partial<Opcao>): Opcao => ({
    id: '', tipo, rotulo, rota, queryParams, grava: q, ...extra,
  });
  const loja = (rotulo: string, queryParams: Params = {}) => op('ver', rotulo, ['/loja'], queryParams);
  const categorias = (rotulo: string, lista: { categoria: Categoria; correlata: boolean }[]) => {
    if (!lista.length) return;
    grupos.push({
      rotulo, pilulas: true, esmaecido: false,
      opcoes: lista.map(({ categoria: c, correlata }) =>
        correlata
          // Fragmento de 2 letras entre aspas ("“al” em Calça") soa como máquina: aí só o nome, com o mesmo filtro.
          ? op('categoria', q.length >= 3 ? `“${q}” em ${c.nome}` : c.nome, ['/loja'], { categoria: c.valor, q })
          : op('categoria', c.nome, ['/loja'], { categoria: c.valor })),
    });
  };
  const produtos = (lista: ProdutoResposta[], esmaecido: boolean) => {
    if (!lista.length) return;
    grupos.push({
      rotulo: 'Produtos', pilulas: false, esmaecido,
      opcoes: lista.slice(0, 6).map(p => op('produto', p.nome, ['/produto', String(p.id)], undefined, { produto: p, partes: destacar(p.nome, q) })),
    });
  };
  const todas = CATEGORIAS.map(categoria => ({ categoria, correlata: false }));

  let final: Opcao;
  let mensagem = '';
  let anuncio = '';
  let esqueleto = false;

  if (q.length < 2) {
    if (recentes.length) {
      grupos.push({
        rotulo: 'Buscas recentes', pilulas: false, esmaecido: false,
        opcoes: [
          ...recentes.map(t => op('recente', t, ['/loja'], { q: t }, { grava: t })),
          op('limpar', 'Limpar buscas recentes', [], undefined, { grava: '' }),
        ],
      });
    }
    categorias('Categorias', todas);
    final = loja('Ver todas as peças');
  } else if (!atual) {
    categorias('Categorias', categoriasRelacionadas(q, []));
    const anteriores = r?.pagina?.content ?? [];
    esqueleto = !anteriores.length;
    produtos(anteriores, true);
    final = loja(`Ver resultados para “${q}”`, { q });
  } else if (!atual.pagina) {
    mensagem = anuncio = 'Não foi possível buscar as peças agora.';
    categorias('Categorias', categoriasRelacionadas(q, []));
    final = loja(`Buscar “${q}” na loja`, { q });
  } else if (!atual.pagina.content.length) {
    mensagem = anuncio = `Nenhuma peça encontrada para “${q}”.`;
    const porNome = categoriasRelacionadas(q, []);
    categorias(porNome.length ? 'Categorias' : 'Explore as categorias', porNome.length ? porNome : todas);
    final = loja('Ver todas as peças');
  } else {
    const { content, totalElements: n } = atual.pagina;
    categorias('Categorias', categoriasRelacionadas(q, content));
    produtos(content, false);
    final = loja(n === 1 ? `Ver 1 resultado para “${q}”` : `Ver todos os ${n} resultados para “${q}”`, { q });
    anuncio = `${n} ${n === 1 ? 'peça encontrada' : 'peças encontradas'}. Use as setas para ver as sugestões.`;
  }

  const comIds = grupos.map((g, i) => ({ ...g, id: `${prefixo}-g-${i}` }));
  const opcoes = [...comIds.flatMap(g => g.opcoes), final];
  opcoes.forEach((o, i) => (o.id = `${prefixo}-op-${i}`));
  return { grupos: comIds, final, opcoes, mensagem, erro: !!atual && !atual.pagina, esqueleto, carregando, anuncio };
}
