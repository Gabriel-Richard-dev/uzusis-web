using FluentValidation;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Domain.Validations;

public class ClienteValidation : AbstractValidator<Cliente>
{
    public ClienteValidation()
    {
        RuleFor(cliente => cliente.CPF)
            .NotEmpty().WithMessage("O CPF é obrigatório.")
            .Length(11).WithMessage("O CPF deve ter 11 caracteres.")
            .Matches(@"^\d{11}$").WithMessage("O CPF deve conter apenas números e ter 11 dígitos.");

        RuleFor(cliente => cliente.Celular)
            .NotEmpty().WithMessage("O número de celular é obrigatório.")
            .Matches(@"^\d{11}$").WithMessage("O número de celular deve conter 11 dígitos.");

        RuleFor(cliente => cliente.DataNascimento)
            .NotEmpty().WithMessage("A data de nascimento é obrigatória.")
            .Must(data => data < DateOnly.FromDateTime(DateTime.Now)).WithMessage("A data de nascimento deve ser anterior à data atual.");

        RuleFor(cliente => cliente.TipoUsuario)
            .IsInEnum().WithMessage("O tipo de usuário é inválido.");

        RuleFor(cliente => cliente.Nome)
            .NotEmpty().WithMessage("O nome é obrigatório.")
            .MaximumLength(100).WithMessage("O nome deve ter no máximo 100 caracteres.");

        RuleFor(cliente => cliente.Email)
            .NotEmpty().WithMessage("O email é obrigatório.")
            .EmailAddress().WithMessage("O email informado é inválido.")
            .EmailAddress().WithMessage("O email informado é inválido.");

        RuleFor(cliente => cliente.Senha)
            .NotEmpty().WithMessage("A senha é obrigatória.")
            .MinimumLength(4).WithMessage("A senha deve ter no mínimo 4 caracteres.");
        
    }
}