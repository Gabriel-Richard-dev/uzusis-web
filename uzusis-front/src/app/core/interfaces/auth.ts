export interface IClienteauth{
email: string,
senha: string
}

export interface IResetarSenha{
codigoRecuperacao: string;
novaSenha: string,
confirmarSenha: string
}

export interface IResetarSenhaCodigo extends IResetarSenha{
  email: string
}



export interface IClienteEmail{
    email: string
}

export interface IClienteConfirmarEmail{
    
  codigo: string
}


export interface IEndereco {
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
  }
  
  export interface ICadastro{
    nome: string;
    email: string;
    senha: string;
    confirmarSenha: string
    cpf: string;
    celular: string;
    dataNascimento: string; // Use uma string para datas ISO 8601
    endereco: IEndereco;
  }
  

  export interface ICodigoEmail{
    email: string
    codigo: string;

  }