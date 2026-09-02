export interface IPedidoPendentes {
  id: number;
  produtoId: number;
  compraId: number;
  tamanhoId: number;
  clienteId: number;
  valorItem: number;
  foiRecebido: boolean;
  sigla: string;
  foiEnviado: boolean;
  quantidade: number;
}


export interface Iproduto{
  paginaAtual:number;
  quantidadedePaginas:number;
  fotoUrls:string[];
  nome:string;
  descricao:string;
  nomePessoa:string;
  categoria:number;
  preco:number;
  id:number;
  tamanhos:string;
  quantidade:number;
  categoriaNome:string;
}