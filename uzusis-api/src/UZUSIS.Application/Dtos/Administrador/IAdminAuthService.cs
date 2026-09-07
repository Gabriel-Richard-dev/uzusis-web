using UZUSIS.Application.Dtos.Token;
using UZUSIS.Application.Dtos.Usuario;

namespace UZUSIS.Application.Dtos.Administrador;

public interface IAdminAuthService
{
    Task<TokenDto?> Login(LoginUsuarioDto admin);
}