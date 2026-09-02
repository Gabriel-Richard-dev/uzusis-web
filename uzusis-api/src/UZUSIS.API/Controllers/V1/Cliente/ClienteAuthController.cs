using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Endereco;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Application.Notification;
using UZUSIS.Core.ViewModel;

namespace UZUSIS.API.Controllers.V1.Cliente;

[AllowAnonymous]
[Route("[controller]")]
public class ClienteAuth : BaseController
{
    private readonly IClienteAuthService _clienteAuthService;
    private readonly IClienteService _clienteService;
    private readonly IEmailService _emailService;
    
    public ClienteAuth(INotificator notificator, IClienteAuthService clienteAuthService, IEmailService emailService, IClienteService clienteService) : base(notificator)
    {
        _clienteAuthService = clienteAuthService;
        _emailService = emailService;
        _clienteService = clienteService;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginUsuarioDto dto)
    {
        var token = await _clienteAuthService.Login(dto);
        return token != null ? Ok(token) : Unauthorized(new[] { "Email/senha incorretas." });
    }

    [AllowAnonymous]
    [HttpPost("enviar-confirmacao-email")]
    public async Task<IActionResult> Cadastrar([FromBody]ClienteEnviarEmailConfirmacaoDto email)
    {
        var foiEnviado  = await _emailService.EnviarConfirmacao(email.Email);
        return Ok(new EmailViewModelResponse
        {
            FoiEnviado = foiEnviado
        });
    }
    
    [AllowAnonymous]
    [HttpPost("codigo-valido")]
    public async Task<IActionResult> ValidarCodigo(ValidarCodigoClienteDto dto)
    {
        return CustomResponse(await _clienteAuthService.CodigoValido(dto.Email, dto.Codigo));
    }
    
    [AllowAnonymous]
    [HttpPost("cadastrar")]
    public async Task<IActionResult> Adicionar(AdicionarClienteDto usuarioDto)
    {
        return CustomResponse(await _clienteService.AdicionarCliente(usuarioDto));
    }
    
    [AllowAnonymous]
    [HttpPost("enviar-recuperacao-senha")]
    public async Task<IActionResult> EnviarRecuperacao([FromBody]ClienteEnviarEmailConfirmacaoDto email)
    {
        var foiEnviado = await _emailService.EnviarRecuperacao(email.Email);
        return CustomResponse(new EmailViewModelResponse
        {
            FoiEnviado = foiEnviado
        });
    }
    
    [AllowAnonymous]
    [HttpPost("recuperar-senha")]
    public async Task<IActionResult> RecuperarSenha([FromBody] RecuperarSenhaClienteDto dto)
    {
        return CustomResponse(await _clienteAuthService.RecuperarSenha(dto));
    }
    

}