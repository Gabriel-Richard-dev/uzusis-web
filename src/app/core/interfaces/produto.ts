

export interface produto{
  paginaAtual:number;
  quantidadedePaginas:number;
  fotoUrls:string[];
  nome:string;
  descricao:string;
  nomePessoa:string;
  categoria:number;
  preco:number;
  id:number;
  tamanhos:tamanhos[];
  quantidade:number;
  categoriaNome:string;
}

export interface tamanhos{
sigla:string;
quantidade:number;
}

export interface Carrinho{
  produtoId:number,
  sigla:string,
  quantidade:number
}

export interface Pedido{
  id:number
  produtoId:number;
  quantidade:number
  valorPedido:number
  sigla:string
}

