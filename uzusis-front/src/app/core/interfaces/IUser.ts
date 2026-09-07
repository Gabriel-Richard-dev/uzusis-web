export interface IEndereco {
    bairro: string;
    cep: string;
    cidade: string;
    estado: string;
    numero: string;
    rua: string;
  }
  
  export interface IUsuario {
    nome: string;
    email: string;
    cpf: string;
    celular: string;
    dataNascimento: string; // Pode ser `Date` se você pretende usar objetos Date
    endereco: IEndereco;
  }

