export interface IPedidoPendentes {
  id: number;
  produtoId: number;
  compraId: number;
  tamanhoId: number;
  clienteId: number;
  valorItem: number;
  foiRecebido: boolean;
  foiEnviado: boolean;
  quantidade: number;
}