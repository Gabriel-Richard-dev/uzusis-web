using UZUSIS.Core.Enums;

namespace UZUSIS.Application.Dtos.Categoria;

public class CategoriaDto
{
    public ECategoriaProduto Categoria { get; set; }

    public string NomeCategoria { get; set; } = string.Empty;
}