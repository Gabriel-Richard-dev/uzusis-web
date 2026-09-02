using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Carrinho;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Enums;
using UZUSIS.Core.ViewModel;

namespace UZUSIS.API.Controllers.V1.Carrinho;

[Authorize]
public class CarrinhoController : BaseController
{
    private readonly ICarrinhoService _carrinhoService;
    public CarrinhoController(INotificator notificator, ICarrinhoService carrinhoService) : base(notificator)
    {
        _carrinhoService = carrinhoService;
    }
    
    [Authorize(Roles = nameof(ETipoUsuario.Cliente))]
    [HttpPost("Adicionar-ao-Carrinho")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> AdicionarAoCarrinho(RequisicaoCarrinhoDto requisicaoCarrinhoDto)
    {
        return CustomResponse(await _carrinhoService.AdicionarAoCarrinho(requisicaoCarrinhoDto));
    }

    [Authorize(Roles = nameof(ETipoUsuario.Cliente))]
    [HttpGet("pedidos")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterPedidos()
    {
        return CustomResponse(await _carrinhoService.ObterPedidos());
    }
    
    [Authorize(Roles = nameof(ETipoUsuario.Cliente))]
    [HttpDelete("remover-carrinho")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RemoverPedido([FromQuery] int pedidoId)
    {
        return CustomResponse(await _carrinhoService.RemoverPedido(pedidoId));
    }
}