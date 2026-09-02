namespace UZUSIS.Application.Dtos.Pedido;

public class PedidoDto
{
    public long? CarrinhoId { get; set; }
    public long ProdutoId { get; set; }
    public long TamanhoId { get; set; }
    public string Sigla { get; set; }
    public long ClienteId { get; set; }
    public int Quantidade { get; set; }
    public decimal ValorPedido { get; set; }
}