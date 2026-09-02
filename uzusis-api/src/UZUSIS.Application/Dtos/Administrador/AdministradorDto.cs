using UZUSIS.Core.Enums;

namespace UZUSIS.Application.Dtos.Administrador;

public class AdministradorDto
{
    public string Nome { get; set; }
    public string Email { get; set; }
    public string Senha { get; set; }
    public ETipoUsuario TipoUsuario { get; set; }
}