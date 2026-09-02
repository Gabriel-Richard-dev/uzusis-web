using Microsoft.AspNetCore.Http;
using UZUSIS.Application.Dtos.Foto;
using UZUSIS.Application.Dtos.Produto.Acessories;
using UZUSIS.Core.Enums;

namespace UZUSIS.Application.Dtos.Produto;

public class AdicionarProdutoDto : IAgreggateFotoList
{
   
    
    public string Nome { get; set; } = null!;
    public decimal Preco { get; set; }

    public int QuantidadeP { get; set; } = 0;
    public int QuantidadeM { get; set; } = 0;
    public int QuantidadeG { get; set; } = 0;
 
    
    public ECategoriaProduto Categoria { get; set; }
    public string Descricao { get; set; } = null!;
    public List<IFormFile> FotoFiles { get; set; }
}

public class TamanhoDto()
{
    public string Sigla { get; set; }
    public int Quantidade { get; set; }
}