using AutoMapper;
using UZUSIS.Application.Dtos.Administrador;
using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Compra;
using UZUSIS.Application.Dtos.ConfirmacaoEmail;
using UZUSIS.Application.Dtos.Endereco;
using UZUSIS.Application.Dtos.Foto;
using UZUSIS.Application.Dtos.Pedido;
using UZUSIS.Application.Dtos.Produto;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Application.Configuration;

public class AutoMapperProfile : Profile
{
    public AutoMapperProfile()
    {

        #region Administrador

        CreateMap<Administrador, AdministradorDto>().ReverseMap();
        CreateMap<Administrador, AdicionarUsuarioDto>().ReverseMap();
        CreateMap<Administrador, LoginUsuarioDto>().ReverseMap();

        #endregion

        #region Cliente

        CreateMap<Cliente, ClienteDto>()
            .ReverseMap();
        CreateMap<Cliente, AdicionarUsuarioDto>().ReverseMap();
        CreateMap<Cliente, AdicionarClienteDto>()
            .ReverseMap();
        CreateMap<ClienteDto, AdicionarClienteDto>()
            .ReverseMap();

        #endregion

        #region Pedido

        CreateMap<Pedido, PedidoDto>().ReverseMap();
        CreateMap<Pedido, PedidoCarrinhoDto>().ReverseMap();
        CreateMap<PedidoDto, PedidoCarrinhoDto>().ReverseMap();
        
        #endregion

        #region Endereco

        CreateMap<Endereco, EnderecoDto>().ReverseMap();

        #endregion
        
        #region ConfirmacaoEmail

        CreateMap<ConfirmacaoEmail, ConfirmacaoEmailDto>().ReverseMap();

        #endregion
        
        #region Tamanho

        CreateMap<TamanhoDto, Tamanho>().ReverseMap();

        #endregion
        
        #region Produto

        CreateMap<ProdutoDto, Produto>().ReverseMap();
        CreateMap<AtualizarProdutoDto, Produto>().ReverseMap();
        CreateMap<AdicionarProdutoDto, Produto>().ReverseMap();
        CreateMap<AdicionarProdutoDto, ProdutoDto>().ReverseMap();
        
        #endregion

        #region Foto

        CreateMap<Foto, FotoProdutoDto>().ReverseMap();

        #endregion

        #region Compra

        CreateMap<CompraDto, Compra>().ReverseMap();
        CreateMap<ItemCompraDto, ItemCompra>().ReverseMap();

        #endregion

    }
}