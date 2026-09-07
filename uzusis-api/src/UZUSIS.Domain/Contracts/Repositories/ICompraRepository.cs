using UZUSIS.Core.Enums;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Domain.Contracts.Repositories;

public interface ICompraRepository : IBaseRepository<Compra>
{
    Task<Compra?> Adicionar(Compra entity);
    Task<List<Compra>> ObterPeloCliente(long clienteId, bool pesquisarEmAndamento = false);
    Task<List<ItemCompra>> ObterItens(EPedidoQuery ePedidoQuery);
  

    Task<ItemCompra?> EnviarItem(long itemCompraId);
    Task<ItemCompra?> ReceberItem(long itemCompraId);
}