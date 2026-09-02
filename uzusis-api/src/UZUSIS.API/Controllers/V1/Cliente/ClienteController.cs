using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Extensions;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Endereco;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Enums;

namespace UZUSIS.API.Controllers.V1.Cliente;

[ApiController]
[Route("[controller]")]
public class ClienteController : BaseController
{
    private readonly IClienteService _clienteService;
    private readonly ICarrinhoService _carrinhoService;
    
    public ClienteController(INotificator notificator, IClienteService clienteService, ICarrinhoService carrinhoService) : base(notificator)
    {
        _clienteService = clienteService;
        _carrinhoService = carrinhoService;
    }
    
    
    [Authorize(Roles = nameof(ETipoUsuario.Cliente))]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Obter()
    {
        return CustomResponse(await _clienteService.ObterCliente());
    }
    
    
    [Authorize(Roles = nameof(ETipoUsuario.Administrador))]
    [HttpGet("admin/obter-cliente")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Obter([FromQuery] long id)
    {
        return CustomResponse(await _clienteService.ObterCliente(id));
    }
    

    [AllowAnonymous]
    [HttpPatch]
    public async Task<IActionResult> Atualizar(AtualizarCadastroClienteDto cadastroClienteDto)
    {
        return CustomResponse(await _clienteService.AtualizarCliente(cadastroClienteDto));
    }
    
    [AllowAnonymous]
    [HttpPatch("endereco")]
    public async Task<IActionResult> Atualizar(AtualizarEnderecoDto enderecoDto)
    {
        return CustomResponse(await _clienteService.AtualizarEndereco(enderecoDto));
    }
    
    [AllowAnonymous]
    [HttpPost("resetar-senha")]
    public async Task<IActionResult> RecuperarSenha([FromBody] ResetarSenhaClienteDto dto)
    {
        return CustomResponse(await _clienteService.ResetarSenha(dto));
    }
}