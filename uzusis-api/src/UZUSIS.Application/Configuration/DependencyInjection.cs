using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NetDevPack.Security.Jwt.Core.Interfaces;
using UZUSIS.Application.Notification;
using UZUSIS.Infra.Data.Configuration;
using UZUSIS.Infra.Data.Context;
using Pomelo.EntityFrameworkCore.MySql;
using ScottBrady91.AspNetCore.Identity;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Administrador;
using UZUSIS.Application.Services;
using UZUSIS.Core.Settings;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Application.Configuration;

public static class DependencyInjection
{
    public static void ConfigureApplication(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        var serverVersion = ServerVersion.AutoDetect(connectionString);
        
        services.AddDbContext<ApplicationContext>(options =>
        {
            options.UseMySql(connectionString, serverVersion);
            options.EnableDetailedErrors();
            options.EnableSensitiveDataLogging();
        });

        services.AddAutoMapper(Assembly.GetExecutingAssembly());

        services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));
    }



    public static void ConfigurarDependencias(this IServiceCollection services)
    {
        services.AdicionarDependenciasRepository();
        
        services
            .AddScoped<INotificator, Notificator>();

        services
            .AddScoped<IPasswordHasher<Administrador>, Argon2PasswordHasher<Administrador>>()
            .AddScoped<IPasswordHasher<Cliente>, Argon2PasswordHasher<Cliente>>()
            .AddScoped<IPasswordHasher<ConfirmacaoEmail>, Argon2PasswordHasher<ConfirmacaoEmail>>()
            .AddScoped<IPasswordHasher<RecuperacaoSenhaEmail>, Argon2PasswordHasher<RecuperacaoSenhaEmail>>();

        services.AddScoped<IEmailService, EmailService>();
        services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

        services
            .AddScoped<IAdministradorService, AdministradorService>()
            .AddScoped<IAdminAuthService, AdminAuthService>()
            .AddScoped<IProdutoService, ProdutoService>()
            .AddScoped<IClienteService, ClienteService>()
            .AddScoped<ICarrinhoService, CarrinhoService>()
            .AddScoped<IClienteAuthService, ClienteAuthService>()
            .AddScoped<ICompraService, CompraService>();
    }
}