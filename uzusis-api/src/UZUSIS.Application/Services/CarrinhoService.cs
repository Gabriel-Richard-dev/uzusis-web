using AutoMapper;
using Microsoft.AspNetCore.Http;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Carrinho;
using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Pedido;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Extensions;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Application.Services;

public class CarrinhoService : BaseService, ICarrinhoService
{
    private readonly ICarrinhoRepository _carrinhoRepository;   
    private readonly IClienteRepository _clienteRepository;   
    private readonly IProdutoRepository _produtoRepository;   
    private readonly IPedidoRepository _pedidoRepository;
    private readonly IHttpContextAccessor _httpContext;
    
    public CarrinhoService(INotificator notificator, IMapper mapper, ICarrinhoRepository carrinhoRepository, IClienteRepository clienteRepository, IProdutoRepository produtoRepository, IPedidoRepository pedidoRepository, IHttpContextAccessor httpContextAccessor) 
        : base(notificator, mapper)
    {
        _carrinhoRepository = carrinhoRepository;
        _clienteRepository = clienteRepository;
        _produtoRepository = produtoRepository;
        _pedidoRepository = pedidoRepository;
        _httpContext = httpContextAccessor;
    }

    public async Task<PedidoDto?> AdicionarAoCarrinho(RequisicaoCarrinhoDto requisicao)
    {

        var clienteId = await ObterIdUsuarioAutenticado();

        if (Notificator.HasNotification)
            return null;
        
        
        var cliente = await _clienteRepository.Obter(clienteId);
        var produto = await _produtoRepository.Obter(requisicao.ProdutoId);

        if (cliente is null || produto is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }


        var carrinho = await _carrinhoRepository.Obter(cliente.CarrinhoId);
        
        bool tamanhoForaDoPadrao =   !( requisicao.Sigla.ToUpper().Equals("P") 
                                     || requisicao.Sigla.ToUpper().Equals("M") 
                                     || requisicao.Sigla.ToUpper().Equals("G"));

        if (tamanhoForaDoPadrao)
        {
            Notificator.Handle("Sigla fora do padrão");
            return null;
        }

        var tamanho = produto
            .Tamanhos
            .FirstOrDefault(c => 
                c.Sigla.ToUpper()
                    .Equals(requisicao.Sigla.ToUpper()));

        
        int contadorDePedidos = 0;

        foreach (var p in carrinho.Pedidos.Where(c=> c.ProdutoId == requisicao.ProdutoId 
                                                     && c.CarrinhoId != null &&  c.TamanhoId == tamanho.Id))
        {
            Console.WriteLine("Quantidade= " + p.Quantidade);
            contadorDePedidos = contadorDePedidos + p.Quantidade;
        }

       
        if (tamanho.Quantidade < requisicao.Quantidade)
        {
            Notificator.Handle("Pedido excede a quantidade total do tamanho do produto");
            return null;
        }

        
        if (contadorDePedidos > tamanho.Quantidade || contadorDePedidos + requisicao.Quantidade > tamanho.Quantidade)
        {
            Notificator.Handle("Você já tem o limite de produtos por usuário no seu carrinho");
            return null;
        }

        contadorDePedidos = 0;
        
        var pedido = new PedidoDto
        {
            ClienteId = cliente.Id,
            CarrinhoId = carrinho!.Id,
            Quantidade = requisicao.Quantidade,
            ProdutoId = produto.Id,
            TamanhoId = tamanho.Id,
            ValorPedido = (decimal)(requisicao.Quantidade * produto.Preco),
            Sigla = tamanho.Sigla
        };

        await _pedidoRepository.Adicionar(Mapper.Map<Pedido>(pedido));
        await _pedidoRepository.UnitOfWork.Commit();

        return pedido;

    }

    public async Task<List<PedidoCarrinhoDto>> ObterPedidos()
    {
        var id = await ObterIdUsuarioAutenticado();

        if (Notificator.HasNotification)
            return null;
        
        var pedidos = await _pedidoRepository.ObterPedidosCliente(id);
        return Mapper.Map<List<PedidoCarrinhoDto>>(pedidos);
    }

    public async Task<bool> RemoverPedido(int pedidoId)
    {
        var user = await ObterIdUsuarioAutenticado();
        var pedido = (await _pedidoRepository.ObterPedidosCliente(user)).FirstOrDefault(c => c.Id == pedidoId);

        if (pedido is null)
        {
            Notificator.HandleNotFoundResource();
            return false;
        }

        await _pedidoRepository.Excluir(pedido);
        if (await _pedidoRepository.UnitOfWork.Commit())
        {
            return true;
        }

        Notificator.Handle("Não foi possivel remover o pedido");
        return false;

    }


    private async Task<long> ObterIdUsuarioAutenticado()
    {
        if (_httpContext is null)
        {
            Notificator.Handle("Impossivel encontrar o httpContext");
            return 0;
        }

        long? usuarioId = _httpContext.ObterUsuarioId();
        if (usuarioId == null)
        {
            Notificator.HandleNotFoundResource();
            return 0;
        }

        long id = usuarioId.Value;

        return id;
    }
    
}