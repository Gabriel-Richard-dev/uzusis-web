using Microsoft.EntityFrameworkCore;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Infra.Data.Context;

namespace UZUSIS.Infra.Data.Repositories;

public class PedidoRepository : BaseRepository<Pedido>, IPedidoRepository
{
    public PedidoRepository(ApplicationContext context) : base(context)
    {
    }

    public async Task<List<Pedido>> ObterPedidosCliente(long clienteId)
    {
        
        var cliente = Context.Clientes
            .AsNoTrackingWithIdentityResolution().FirstOrDefault(c => c.Id == clienteId);

        var pedidos =
            Context.Pedidos.AsNoTrackingWithIdentityResolution()
                .Include(c => c.Produto)
                .Where(c => c.CarrinhoId == cliente.CarrinhoId).ToList();
        
        return pedidos;


    }
        
     
    public async Task<List<Pedido>> ObterAtivos(long clienteId, long tamanhoId)
    {
        var pedidos = await Context.Pedidos
            .Where(c=> c.ClienteId == clienteId && c.TamanhoId == tamanhoId &&  c.CarrinhoId != null)
            .ToListAsync();
        
        return pedidos;
    }

    
    
}