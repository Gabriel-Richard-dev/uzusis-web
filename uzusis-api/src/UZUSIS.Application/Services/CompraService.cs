using AutoMapper;
using Microsoft.AspNetCore.Http;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Compra;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Enums;
using UZUSIS.Core.Extensions;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Application.Services;

public class CompraService : BaseService, ICompraService
{
    
    private readonly ICompraRepository _compraRepository;
    private readonly IClienteRepository _clienteRepository;
    private readonly ICarrinhoRepository _carrinhoRepository;
    private readonly IPedidoRepository _pedidoRepository;
    private readonly IProdutoRepository _produtoRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;
    
    public CompraService(INotificator notificator, IMapper mapper, ICompraRepository compraRepository, IHttpContextAccessor httpContextAccessor, IClienteRepository clienteRepository, ICarrinhoRepository carrinhoRepository, IPedidoRepository pedidoRepository, IProdutoRepository produtoRepository) : base(notificator, mapper)
    {
        _compraRepository = compraRepository;
        _httpContextAccessor = httpContextAccessor;
        _clienteRepository = clienteRepository;
        _carrinhoRepository = carrinhoRepository;
        _pedidoRepository = pedidoRepository;
        _produtoRepository = produtoRepository;
    }

    public async Task<bool> ComprarCarrinho()
    {
        var usuarioId = (int)_httpContextAccessor.ObterUsuarioId()!;
        
        var cliente = await _clienteRepository.Obter(usuarioId);

        if (cliente is null)
        {
            Notificator.Handle("Cliente inexistente.");
            return false;
        }
        
        var carrinho = await _carrinhoRepository.Obter(cliente.CarrinhoId);

        if (carrinho is null)
        {
            Notificator.HandleNotFoundResource();
            return false;
        }
        
        var pedidos = await _pedidoRepository.ObterPedidosCliente(usuarioId);
        var compra = new Compra();
        decimal valorTotal = 0;
        List<ItemCompra> items = new List<ItemCompra>();
        foreach (var pedido in pedidos)
        {
            valorTotal += pedido.ValorPedido;
            
            items.Add(new ItemCompra()
            {
                ProdutoId = pedido.ProdutoId,
                Quantidade = pedido.Quantidade,
                ValorItem = pedido.ValorPedido,
                ClienteId = pedido.ClienteId,
                TamanhoId = pedido.TamanhoId,
                Sigla = pedido.Sigla
            });
        }
        
        compra.ClienteId = cliente.Id;
        compra.ValorTotal = valorTotal;
        compra.Itens = items;

        await _compraRepository.Adicionar(compra);
        carrinho.FlushCarrinho();
        await _carrinhoRepository.Atualizar(carrinho);
        
        if (await _compraRepository.UnitOfWork.Commit())
        {
            return true;
        }
        
        Notificator.Handle("Não foi possivel terminar a compra");
        return false;
    }

    public async Task<List<ItemCompraDto>> ObterHistorico()
    {
        var usuarioId = (int)_httpContextAccessor.ObterUsuarioId()!;
        
        var cliente = await _clienteRepository.Obter(usuarioId);

        if (cliente is null)
        {
            Notificator.Handle("Cliente inexistente");
            return null!;
        }

        List<ItemCompraDto> itensRetorno = new List<ItemCompraDto>();
        List<ItemCompra> toRemoveItens = new List<ItemCompra>();
        var compras = await _compraRepository.ObterPeloCliente(cliente.Id);

        foreach (var compra in compras) 
        {
            foreach (var item in compra.Itens)
            {
                if (!item.FoiRecebico)
                {
                    toRemoveItens.Add(item);
                }
                else
                {
                    itensRetorno.Add(Mapper.Map<ItemCompraDto>(item));
                }
            }

            foreach (var remove in toRemoveItens)
            {
                compra.Itens.Remove(remove);
            }
        }

        return itensRetorno;

    }

    public async Task<List<ItemCompraDto>> ObterEmAndamento()
    {
        var usuarioId = (int)_httpContextAccessor.ObterUsuarioId()!;
        
        var cliente = await _clienteRepository.Obter(usuarioId);

        if (cliente is null)
        {
            Notificator.Handle("Cliente inexistente");
            return null!;
        }

        var compras = await _compraRepository.ObterPeloCliente(cliente.Id);
        List<ItemCompra> toRemoveItens = new List<ItemCompra>();
        List<ItemCompraDto> itensRetorno = new List<ItemCompraDto>();
        foreach (var compra in compras) 
        {
            foreach (var item in compra.Itens)
            {
                if (item.FoiRecebico)
                    toRemoveItens.Add(item);
                else
                {
                    itensRetorno.Add(Mapper.Map<ItemCompraDto>(item));
                }
            }

            foreach (var remove in toRemoveItens)
            {
                compra.Itens.Remove(remove);
            }
        }

        return itensRetorno;
    }

    public async Task<List<ItemCompraDto>> ObterTodosOsPedidos(EPedidoQuery ePedidoQuery)
    {
        return Mapper.Map<List<ItemCompraDto>>(await _compraRepository.ObterItens(ePedidoQuery));
    }

    public async Task<ItemCompraDto?> EnviarItemCompra(long itemCompraId)
    {
        var item = await _compraRepository.EnviarItem(itemCompraId);
        await _compraRepository.UnitOfWork.Commit();
        return Mapper.Map<ItemCompraDto>(item);
    }

    public async Task<ItemCompraDto?> ReceberItemCompra(long itemCompraId)
    {
        var userId = _httpContextAccessor.ObterUsuarioId()!;

        if (userId is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }
        
        var compras = (await _compraRepository.ObterPeloCliente((long)userId));
        ItemCompra? itemCompra = null;

        foreach (var compra in compras)
        {
            foreach (var itm in compra.Itens)
            {
                if(itm.Id == itemCompraId && itm.FoiEnviado && !itm.FoiRecebico)
                    itemCompra = itm;
            }
        }
        
        if (itemCompra is null)
        {
            Notificator.Handle("Produto ainda não foi enviado");
            return null;
        }
        
        var item = await _compraRepository.ReceberItem(itemCompraId);
        await _compraRepository.UnitOfWork.Commit();
        return Mapper.Map<ItemCompraDto>(item);
    }
}