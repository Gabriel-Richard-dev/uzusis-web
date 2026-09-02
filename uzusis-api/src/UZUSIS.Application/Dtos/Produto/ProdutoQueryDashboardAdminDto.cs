using UZUSIS.Core.Enums;

namespace UZUSIS.Application.Dtos.Produto;

public class ProdutoQueryDashboardAdminDto
{
    public string Nome { get; set; }
    public long Id { get; set; }
    public ECategoriaProduto CategoriaProduto { get; set; }
    public EProdutoTransporteSituacao TransporteSituacao { get; set; }
    public EStatusProduto StatusProduto { get; set; }
}