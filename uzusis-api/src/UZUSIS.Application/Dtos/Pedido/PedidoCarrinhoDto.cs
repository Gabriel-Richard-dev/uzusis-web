namespace UZUSIS.Application.Dtos.Pedido;

public class PedidoCarrinhoDto
{
    public long Id { get; set; }
    public long ProdutoId { get; set; }
    public decimal ValorPedido { get; set; }
    public int Quantidade { get; set; }
    public string Sigla { get; set; }
}