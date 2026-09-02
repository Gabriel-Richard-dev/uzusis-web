namespace UZUSIS.Application.Dtos.Produto;

public class RetornoPaginadoDto
{
    public int QuantidadePaginas { get; set; }
    public IEnumerable<ProdutoDto> Produtos { get; set; }

}