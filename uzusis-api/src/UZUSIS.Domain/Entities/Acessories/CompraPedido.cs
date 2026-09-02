using UZUSIS.Domain.Abstractions;

namespace UZUSIS.Domain.Entities.Acessories;

public class CompraPedido : Entity
{
    public long CompraId { get; set; }
    public List<long> PedidosId {get; set;}
    public Compra Compra {get; set;}
    
}