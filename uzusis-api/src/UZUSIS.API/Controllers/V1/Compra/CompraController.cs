using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Enums;
using UZUSIS.Core.ViewModel;

namespace UZUSIS.API.Controllers.V1.Compra;

[ApiController]
[Route("[controller]")]
public class CompraController : BaseController
{
    private readonly ICarrinhoService _carrinhoService;
    private readonly ICompraService _compraService;
    public CompraController(INotificator notificator, ICarrinhoService carrinhoService, ICompraService compraService) : base(notificator)
    {
        _carrinhoService = carrinhoService;
        _compraService = compraService;
    }
    

    [Authorize(Roles = nameof(ETipoUsuario.Cliente))]
    [HttpPost("cliente/carrinho")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ComprarCarrinho()
    {
        var foiComprado = await _compraService.ComprarCarrinho();

        return CustomResponse(new CarrinhoCompraViewModel()
        {
            FoiComprado = foiComprado
        });

    }
    
    [Authorize(Roles = nameof(ETipoUsuario.Cliente))]
    [HttpGet("cliente/historico")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> HistoricoCliente()
    {
        return CustomResponse(await _compraService.ObterHistorico());
    } 
    
    [Authorize(Roles = nameof(ETipoUsuario.Cliente))]
    [HttpGet("cliente/em-andamento")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> EmAndamentoCliente()
    {
        return CustomResponse(await _compraService.ObterEmAndamento());
    }
    
    [Authorize(Roles = nameof(ETipoUsuario.Administrador))]
    [HttpGet("administrador/dashboard")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> HistoricoAdministrador([FromQuery] EPedidoQuery pedidoQuery)
    {
        return CustomResponse(await _compraService.ObterTodosOsPedidos(pedidoQuery));
    }
    
    [Authorize(Roles = nameof(ETipoUsuario.Administrador))]
    [HttpPatch("administrador/dashboard/enviar-produto")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> EnviarItem([FromQuery] long itemCompraId)
    {
        return CustomResponse(await _compraService.EnviarItemCompra(itemCompraId));
    }
    
    [Authorize(Roles = nameof(ETipoUsuario.Cliente))]
    [HttpPatch("cliente/recebi-produto")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ReceberItem([FromQuery] long itemCompraId)
    {
        return CustomResponse(await _compraService.ReceberItemCompra(itemCompraId));
    }
    
    
    
    

}