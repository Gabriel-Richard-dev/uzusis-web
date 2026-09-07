using Microsoft.AspNetCore.Http;

namespace UZUSIS.Application.Dtos.Produto.Acessories;

public interface IAgreggateFotoList
{
    public List<IFormFile> FotoFiles { get; set; }
}