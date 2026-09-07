using UZUSIS.Domain.Abstractions;

namespace UZUSIS.Domain.Entities.Acessories;

public class ItemCompra : Entity
{
    public long ProdutoId { get; set; }
    public long CompraId { get; set; }
    public long TamanhoId { get; set; }
    public long ClienteId { get; set; }
    public string Sigla { get; set; }
    public bool FoiRecebico { get; set; } = false;
    public bool FoiEnviado { get; set; } = false;
    public int Quantidade { get; set; }
    public decimal ValorItem { get; set; }
    public Produto Produto { get; set; }
    public Compra Compra { get; set; }
    public Cliente Cliente { get; set; }
}