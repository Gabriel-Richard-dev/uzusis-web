using FluentValidation;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Domain.Validations;

public class AdministradorValidation : AbstractValidator<Administrador>
{
    public AdministradorValidation()
    {
        RuleFor(admin => admin.TipoUsuario)
            .IsInEnum().WithMessage("O tipo de usuário é inválido.");

        RuleFor(admin => admin.Nome)
            .NotEmpty().WithMessage("O nome é obrigatório.")
            .MaximumLength(100).WithMessage("O nome deve ter no máximo 100 caracteres.");

        RuleFor(admin => admin.Email)
            .NotEmpty().WithMessage("O email é obrigatório.")
            .EmailAddress().WithMessage("O email informado é inválido.")
            .EmailAddress().WithMessage("O email informado é inválido.");

        RuleFor(admin => admin.Senha)
            .NotEmpty().WithMessage("A senha é obrigatória.")
            .MinimumLength(4).WithMessage("A senha deve ter no mínimo 4 caracteres.");
    }
}