

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
// export interface produtos{
//   fotoUrls:string[];
//   nome:string;
//   descricao:string;
//   nomePessoa:string;
//   categoria:string;
//   preco:number;
//   id:number;
//   tamanhos:string[];
//   quantidade:number;
// }

// export interface produto{
//   quantidadePaginas:number;
//   produto:produtos[]
// }

export interface tamanhos{
sigla:string;
quantidade:number;
}

export interface Carrinho{
  produtoId:number,
  sigla:string,
  quantidade:number
}