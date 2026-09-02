namespace UZUSIS.Application.Dtos.Compra;

public class CompraDto
{
    public decimal ValorTotal { get; set; }
    public List<ItemCompraDto> Itens { get; set; }
}