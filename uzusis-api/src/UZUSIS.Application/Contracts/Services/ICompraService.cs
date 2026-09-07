using UZUSIS.Application.Dtos.Compra;
using UZUSIS.Core.Enums;

namespace UZUSIS.Application.Contracts.Services;

public interface ICompraService
{
    Task<bool> ComprarCarrinho();
    Task<List<ItemCompraDto>> ObterHistorico();
    Task<List<ItemCompraDto>> ObterEmAndamento();
    
    Task<List<ItemCompraDto>> ObterTodosOsPedidos(EPedidoQuery pedidoQuery);
    
    Task<ItemCompraDto?> EnviarItemCompra(long itemCompraId);
    Task<ItemCompraDto?> ReceberItemCompra(long itemCompraId);
    
}