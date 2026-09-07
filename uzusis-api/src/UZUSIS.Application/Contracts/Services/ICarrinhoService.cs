using UZUSIS.Application.Dtos.Carrinho;
using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Pedido;

namespace UZUSIS.Application.Contracts.Services;

public interface ICarrinhoService
{
    Task<PedidoDto?> AdicionarAoCarrinho(RequisicaoCarrinhoDto requisicaoCarrinhoDto);
    Task<List<PedidoCarrinhoDto>> ObterPedidos();
    Task<bool> RemoverPedido(int pedidoId);
}