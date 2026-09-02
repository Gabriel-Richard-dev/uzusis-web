using FluentValidation;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Domain.Validations;

public class ProdutoValidation : AbstractValidator<Produto>
{
    public ProdutoValidation()
    {
        RuleFor(produto => produto.Nome)
            .NotEmpty().WithMessage("O nome do produto é obrigatório.")
            .MaximumLength(100).WithMessage("O nome do produto deve ter no máximo 100 caracteres.");

        RuleFor(produto => produto.Preco)
            .GreaterThan(0).WithMessage("O preço do produto deve ser maior que zero.");

        RuleFor(produto => produto.Categoria)
            .IsInEnum().WithMessage("A categoria do produto é inválida.");

        RuleFor(produto => produto.Descricao)
            .NotEmpty().WithMessage("A descrição do produto é obrigatória.")
            .MaximumLength(500).WithMessage("A descrição do produto deve ter no máximo 500 caracteres.");
    }
}