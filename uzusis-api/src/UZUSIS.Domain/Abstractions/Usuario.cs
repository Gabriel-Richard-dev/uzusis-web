using UZUSIS.Core.Enums;

namespace UZUSIS.Domain.Abstractions;

public abstract class Usuario : Entity
{
    public ETipoUsuario TipoUsuario { get; set; }
    public string Nome { get; set; }
    public string Email { get; set; }
    public string Senha { get; set; }
}