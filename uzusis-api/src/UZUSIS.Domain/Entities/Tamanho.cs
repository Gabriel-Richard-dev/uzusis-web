using UZUSIS.Core.Enums;

namespace UZUSIS.Domain.Entities;

public class Tamanho
{
    public long Id { get; set; }
    public string Sigla { get; set; }
    public long ProdutoId { get; set; }
    public int Quantidade { get; set; }

    public EStatusProduto StatusTamanho
    {
        get
        {
            if (Quantidade <= 0)
                return EStatusProduto.Indisponivel;

            return EStatusProduto.Indisponivel;
        }
    }


    public Produto Produto { get; set; }
    
}