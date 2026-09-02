using UZUSIS.Application.Dtos.Administrador;
using UZUSIS.Application.Dtos.Usuario;

namespace UZUSIS.Application.Contracts.Services;

public interface IAdministradorService
{
    Task<AdministradorDto?> Criar(AdicionarUsuarioDto addAdminDto);
}