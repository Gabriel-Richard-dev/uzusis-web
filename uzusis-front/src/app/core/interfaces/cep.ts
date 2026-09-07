export interface ICEP {         
    logradouro: string;    // Nome do logradouro
    complemento: string;   // Informações adicionais sobre o logradouro
    unidade: string;       // Unidade, se aplicável (por exemplo, bloco ou apto)
    bairro: string;        // Bairro
    localidade: string;    // Cidade ou localidade
    uf: string;            // Unidade Federativa (sigla do estado)
    estado: string;        // Nome do estado
    regiao: string;        // Região geográfica (por exemplo, Sudeste)
    ibge: string;          // Código do município no IBGE
    gia: string;           // Código do GIA (Guia de Identificação do Endereço)
    ddd: string;           // Código de Discagem Direta a Distância (DDD)
    siafi: string;
    erro: string   
}