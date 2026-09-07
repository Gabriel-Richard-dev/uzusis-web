using Microsoft.AspNetCore.Http;
using UZUSIS.Core.Enums;

namespace UZUSIS.Core.Extensions;
public static class HttpContextAccessorExtension
{
    public static bool UsuarioAutenticado(this IHttpContextAccessor? contextAccessor)
    {
        return contextAccessor?.HttpContext?.User.UsuarioAutenticado() ?? false;
    }

    public static long? ObterUsuarioId(this IHttpContextAccessor? contextAccessor)
    {
        var id = contextAccessor?.HttpContext?.User.ObterUsuarioId() ?? string.Empty;
        return string.IsNullOrWhiteSpace(id) ? null : long.Parse(id);
    }

    public static string ObterNome(this IHttpContextAccessor? contextAccessor)
    {
        var nome = contextAccessor?.HttpContext?.User.ObterNomeUsuario() ?? string.Empty;
        return string.IsNullOrWhiteSpace(nome) ? string.Empty : nome;
    }

    public static string ObterEmail(this IHttpContextAccessor? contextAccessor)
    {
        var email = contextAccessor?.HttpContext?.User.ObterEmailUsuario() ?? string.Empty;
        return string.IsNullOrWhiteSpace(email) ? string.Empty : email;
    }

    public static ETipoUsuario? ObterTipoUsuario(this IHttpContextAccessor? contextAccessor)
    {
        var tipo = contextAccessor?.HttpContext?.User?.ObterTipoUsuario() ?? string.Empty;
        return Enum.TryParse(tipo, out ETipoUsuario tipoUsuario) ? tipoUsuario : (ETipoUsuario?)null;
    }

    public static bool EhAdministrador(this IHttpContextAccessor? contextAccessor)
    {
        return ObterTipoUsuario(contextAccessor) == ETipoUsuario.Administrador;
    }

    public static bool EhCliente(this IHttpContextAccessor? contextAccessor)
    {
        return ObterTipoUsuario(contextAccessor) == ETipoUsuario.Cliente;
    }
}
