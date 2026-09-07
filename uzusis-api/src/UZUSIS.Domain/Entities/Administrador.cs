using FluentValidation.Results;
using UZUSIS.Core.Enums;
using UZUSIS.Domain.Abstractions;
using UZUSIS.Domain.Validations;

namespace UZUSIS.Domain.Entities;

public class Administrador : Usuario
{
    public Administrador()
    {
        TipoUsuario = ETipoUsuario.Administrador;
    }


   
    public List<ValidationFailure> Validate()
    {
        List<string> Erros = new List<string>();
        var validateHandler = new AdministradorValidation();

        var response = validateHandler.Validate(this);

        return response.Errors;
    }
    
}