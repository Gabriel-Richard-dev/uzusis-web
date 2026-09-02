namespace UZUSIS.Application.Dtos.Compra;

public class ItemCompraDto
{
    public long Id { get; set; }
    public long ProdutoId { get; set; }
    public long CompraId { get; set; }
    public long TamanhoId { get; set; }
    public string Sigla { get; set; }
    public long ClienteId { get; set; }
    public decimal ValorItem { get; set; }
    public bool FoiRecebico { get; set; } = false;
    public bool FoiEnviado { get; set; } = false;
    public int Quantidade { get; set; }
}