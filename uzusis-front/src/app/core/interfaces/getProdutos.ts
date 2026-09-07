// Define a sub-interface para o tamanho
export interface Tamanho {
    sigla: string;
    quantidade: number;
  }
  
  // Define a sub-interface para a foto
  export   interface FotoUrl {
    url: string;
  }
  
  // Define a interface principal para o produto
  export  interface IgetProduto {
    id: number;
    nome: string;
    preco: number;
    tamanhos: Tamanho[];
    fotoUrls: string[];
    categoria: number;
    categoriaNome: string;
    descricao: string;
  }
  