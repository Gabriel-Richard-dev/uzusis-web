using UZUSIS.Domain.Abstractions;

namespace UZUSIS.Domain.Entities;

public class Carrinho : Entity
{
    public List<Pedido> Pedidos { get; set; }

 
    public void FlushCarrinho()
    {
        Pedidos.Clear();
    }

}