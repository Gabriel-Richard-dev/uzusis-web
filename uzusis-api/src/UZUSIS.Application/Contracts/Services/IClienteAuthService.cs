using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Token;
using UZUSIS.Application.Dtos.Usuario;

namespace UZUSIS.Application.Contracts.Services;

public interface IClienteAuthService
{
    Task<TokenDto?> Login(LoginUsuarioDto loginUsuarioDto);
    Task<bool> CodigoValido(string email, string codigo);
    Task<bool> RecuperarSenha(RecuperarSenhaClienteDto dto);
}