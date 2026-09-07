using FluentValidation.Results;
using UZUSIS.Core.Enums;
using UZUSIS.Domain.Abstractions;
using UZUSIS.Domain.Validations;

namespace UZUSIS.Domain.Entities;

public class Produto : Entity
{
    public string Nome { get; set; } = null!;
    public decimal Preco { get; set; }
    public List<Tamanho> Tamanhos { get; set; } = new();
    public List<Foto> Fotos { get; set; }

    List<string> FotoUrls { get; set; } = new();

    public ECategoriaProduto Categoria { get; set; }
    public string Descricao { get; set; } = null!;

    public EStatusProduto Status
    {
        get
        {
            if (IsIndiponivel())
                return EStatusProduto.Indisponivel;

            return EStatusProduto.Disponivel;
        }
    }

    public List<Pedido> Pedidos { get; set; }
    
    
    public List<ValidationFailure> Validate()
    {
        List<string> Erros = new List<string>();
        var validateHandler = new ProdutoValidation();

        var response = validateHandler.Validate(this);

        return response.Errors;
    }


    bool IsIndiponivel()
    {
        int quantidadeZero = 0;
        foreach (var tamanho in Tamanhos)
        {
            if (tamanho.Quantidade == 0)
            {
                quantidadeZero++;
            }
        }
        
        return quantidadeZero == 3;
    }
    
}