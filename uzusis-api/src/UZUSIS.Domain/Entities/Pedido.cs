using UZUSIS.Domain.Abstractions;

namespace UZUSIS.Domain.Entities;

public class Pedido : Entity
{

    public long? CarrinhoId { get; set; }
    public long ProdutoId { get; set; }
    public long TamanhoId { get; set; }
    public string Sigla { get; set; }
    public long ClienteId { get; set; }
    public int Quantidade { get; set; }
    public decimal ValorPedido { get; set; }
    public Produto Produto { get; set; }
    public Carrinho Carrinho { get; set; }
    public Cliente Cliente { get; set; }
    
}
