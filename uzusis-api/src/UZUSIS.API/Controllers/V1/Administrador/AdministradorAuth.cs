using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Administrador;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Application.Notification;

namespace UZUSIS.API.Controllers.V1.Administrador;

[AllowAnonymous]
public class AdministradorAuth : BaseController
{

    private readonly IAdministradorService _administradorService;
    private readonly IAdminAuthService _adminAuth;
    public AdministradorAuth(INotificator notificator, IAdministradorService administradorService, IAdminAuthService adminAuth) : base(notificator)
    {
        _administradorService = administradorService;
        _adminAuth = adminAuth;
    }


    [AllowAnonymous]
    [HttpPost("Adicionar")]
    public async Task<IActionResult> Criar(AdicionarUsuarioDto user)
    {
        return CustomResponse(await _administradorService.Criar(user));
    }

    [AllowAnonymous]
    [HttpPost("Login")]
    public async Task<IActionResult> Login(LoginUsuarioDto user)
    {
        var token = await _adminAuth.Login(user);

        return token != null ? Ok(token) : Unauthorized(new[] { "Email ou senha incorretos"});
    }
}