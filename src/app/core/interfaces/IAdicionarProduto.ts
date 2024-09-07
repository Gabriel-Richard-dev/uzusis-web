export interface IAdicionarProduto {
    Nome: string;            // Nome do produto
    Preco: number;           // Preço do produto
    QuantidadeP: number;    // Quantidade do tamanho pequeno
    QuantidadeM: number;    // Quantidade do tamanho médio
    QuantidadeG: number;    // Quantidade do tamanho grande
    Categoria: number;      // ID da categoria do produto
    Descricao: string;  
    FotoUrls: any    // Descrição do produto
  }
  
  export interface IFoto{
    Foto: any
  }

  export interface IAdicionarFoto{
    FotoFiles: any
  }

  export interface Categoria {
    categoria: number;
    nomeCategoria: string;
  }