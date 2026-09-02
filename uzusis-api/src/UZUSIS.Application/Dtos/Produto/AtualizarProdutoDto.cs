using Microsoft.AspNetCore.Http;
using UZUSIS.Application.Dtos.Produto.Acessories;
using UZUSIS.Core.Enums;

namespace UZUSIS.Application.Dtos.Produto;

public class AtualizarProdutoDto : IAgreggateFotoList
{
    public long Id { get; set; }
    public string? Nome { get; set; } = null!;
    public decimal? Preco { get; set; }

    public int? QuantidadeP { get; set; } = 0;
    public int? QuantidadeM { get; set; } = 0;
    public int? QuantidadeG { get; set; } = 0;
    public List<IFormFile>? FotoFiles { get; set; } = new();
    
    public ECategoriaProduto? Categoria { get; set; }
    public string? Descricao { get; set; } = null!;
}