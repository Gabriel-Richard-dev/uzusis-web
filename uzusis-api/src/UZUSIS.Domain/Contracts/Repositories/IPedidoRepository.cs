using UZUSIS.Domain.Entities;

namespace UZUSIS.Domain.Contracts.Repositories;

public interface IPedidoRepository : IBaseRepository<Pedido>
{
    Task<List<Pedido>> ObterPedidosCliente(long clienteId);
    Task<List<Pedido>> ObterAtivos(long clienteId, long tamanhoId);
}