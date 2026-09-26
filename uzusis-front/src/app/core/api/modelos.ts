// Tipos dos contratos da API (SPEC §4). Dinheiro é number com 2 casas; datas são strings ISO-8601.

export type CategoriaProduto =
  | 'CALCA' | 'SHORT' | 'SAIA' | 'CROPPED' | 'CONJUNTOS' | 'BLUSAO' | 'BODY' | 'BLUSA' | 'ACESSORIOS';

export type Sigla = 'PP' | 'P' | 'M' | 'G' | 'GG';

export type StatusPedido = 'CRIADO' | 'PAGO' | 'ENVIADO' | 'RECEBIDO' | 'CANCELADO';

export interface Categoria {
  valor: CategoriaProduto;
  nome: string;
}

/** As 9 categorias na ordem do enum (§4.1). Igual à resposta de C3, sem precisar de requisição. */
export const CATEGORIAS: readonly Categoria[] = [
  { valor: 'CALCA', nome: 'Calça' },
  { valor: 'SHORT', nome: 'Short' },
  { valor: 'SAIA', nome: 'Saia' },
  { valor: 'CROPPED', nome: 'Cropped' },
  { valor: 'CONJUNTOS', nome: 'Conjuntos' },
  { valor: 'BLUSAO', nome: 'Blusão' },
  { valor: 'BODY', nome: 'Body' },
  { valor: 'BLUSA', nome: 'Blusa' },
  { valor: 'ACESSORIOS', nome: 'Acessórios' },
];

export const SIGLAS: readonly Sigla[] = ['PP', 'P', 'M', 'G', 'GG'];

export const STATUS_ROTULO: Readonly<Record<StatusPedido, string>> = {
  CRIADO: 'Aguardando pagamento',
  PAGO: 'Pagamento confirmado',
  ENVIADO: 'Enviado',
  RECEBIDO: 'Recebido',
  CANCELADO: 'Cancelado',
};

/** Page do Spring (serialização DIRECT). Campos extras (pageable, sort…) são ignorados. */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  erros?: { campo: string; mensagem: string }[];
}

// ---- Catálogo (§4.2) ----

export interface TamanhoResposta {
  id: number;
  sigla: Sigla;
  quantidade: number;
}

export interface FotoResposta {
  id: number;
  url: string;
  ordem: number;
}

export interface ProdutoResposta {
  id: number;
  nome: string;
  preco: number;
  descricao: string;
  categoria: CategoriaProduto;
  categoriaNome: string;
  ativo: boolean;
  disponivel: boolean;
  criadoEm: string;
  tamanhos: TamanhoResposta[];
  fotos: FotoResposta[];
}

export interface TamanhoEntrada {
  sigla: Sigla;
  quantidade: number;
}

export interface CriarProduto {
  nome: string;
  preco: number;
  descricao: string;
  categoria: CategoriaProduto;
  tamanhos: TamanhoEntrada[];
}

/** C7: campo ausente ou null = não altera. */
export interface AtualizarProduto {
  nome?: string | null;
  preco?: number | null;
  descricao?: string | null;
  categoria?: CategoriaProduto | null;
  ativo?: boolean | null;
}

/** C1. sort: 'criadoEm,desc' | 'preco,asc' | 'preco,desc' | 'nome,asc'… */
export interface FiltroVitrine {
  categoria?: CategoriaProduto | null;
  nome?: string | null;
  page?: number;
  size?: number;
  sort?: string;
}

/** C4. Sem estoque = { ativo: true, disponivel: false }. */
export interface FiltroProdutosAdmin extends FiltroVitrine {
  ativo?: boolean | null;
  disponivel?: boolean | null;
}

// ---- Sacola e pedidos (§4.3) ----

export interface ItemResposta {
  id: number;
  produtoId: number;
  tamanhoId: number;
  sigla: Sigla;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  nomeProduto: string;
  fotoUrl: string | null;
}

export interface CarrinhoResposta {
  itens: ItemResposta[];
  quantidadeItens: number;
  valorTotal: number;
}

export interface EnderecoEntrega {
  destinatario: string;
  telefone?: string | null;
  cep: string;
  rua: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface PedidoResposta {
  id: number;
  status: StatusPedido;
  subtotal: number;
  frete: number;
  valorTotal: number;
  motivoCancelamento: string | null;
  sacolaRestaurada: boolean;
  criadoEm: string;
  expiraEm: string | null;
  pagoEm: string | null;
  enviadoEm: string | null;
  recebidoEm: string | null;
  canceladoEm: string | null;
  cliente: { nome: string; email: string };
  endereco: EnderecoEntrega;
  itens: ItemResposta[];
}

export interface FreteResposta {
  uf: string;
  valor: number;
}

/** O10. status padrão no servidor: PAGO. sort: 'pagoEm,asc' | 'enviadoEm,desc' | 'criadoEm,…' */
export interface FiltroPedidosAdmin {
  status?: StatusPedido[];
  page?: number;
  size?: number;
  sort?: string;
}

export interface ResumoAdmin {
  porStatus: Record<StatusPedido, number>;
  receitaMes: number;
}

// ---- Pagamentos (§4.4) ----

export interface ConfigPagamento {
  habilitado: boolean;
  publishableKey: string | null;
}

export interface ClientSecretResposta {
  clientSecret: string;
  paymentIntentId: string;
}

// ---- Perfil (§4.5) ----

export interface EnderecoPerfil {
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
}

export interface PerfilResposta {
  sub: string;
  email: string | null;
  /** Destinatário padrão da entrega, não o nome da conta. */
  nome: string | null;
  cpf: string | null;
  celular: string | null;
  dataNascimento: string | null;
  endereco: EnderecoPerfil | null;
}

/** I2: campo ausente ou null = mantém. */
export interface AtualizarPerfil {
  nome?: string | null;
  cpf?: string | null;
  celular?: string | null;
  dataNascimento?: string | null;
}

/** I3: campo ausente ou null = mantém; complemento '' = limpa. */
export type AtualizarEndereco = Partial<EnderecoPerfil>;
