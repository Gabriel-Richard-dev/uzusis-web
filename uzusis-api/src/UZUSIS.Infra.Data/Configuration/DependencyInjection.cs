using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Infra.Data.Context;
using UZUSIS.Infra.Data.Repositories;

namespace UZUSIS.Infra.Data.Configuration;

public static class DependencyInjection
{
    public static void AdicionarDependenciasRepository(this IServiceCollection services)
    {

        services
            .AddScoped<IAdministradorRepository, AdministradorRepository>()
            .AddScoped<ICompraRepository, CompraRepository>()
            .AddScoped<IProdutoRepository, ProdutoRepository>()
            .AddScoped<IClienteRepository, ClienteRepository>()
            .AddScoped<ICarrinhoRepository, CarrinhoRepository>()
            .AddScoped<IPedidoRepository, PedidoRepository>();
    }
    
    
  
}