using System.Reflection;
using System.Security.Claims;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ScottBrady91.AspNetCore.Identity;
using UZUSIS.Application.Configuration;
using UZUSIS.Application.Notification;
using UZUSIS.Application.Services;
using UZUSIS.Core.Settings;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;
using UZUSIS.Infra.Data.Context;
using UZUSIS.Infra.Data.Repositories;

namespace UZUSIS.Tests;

/// <summary>
/// Banco de teste em SQLite na memória. A escolha é de propósito: SQLite
/// compara string com caixa, igual ao Postgres e diferente do MySQL de
/// produção. É isso que faz os testes de e-mail valerem alguma coisa —
/// no MySQL a collation esconderia o problema.
/// </summary>
public sealed class BancoDeTeste : IDisposable
{
    private readonly SqliteConnection _conexao;

    public ApplicationContext Context { get; }
    public Notificator Notificator { get; } = new();
    public IMapper Mapper { get; }

    public BancoDeTeste()
    {
        _conexao = new SqliteConnection("DataSource=:memory:");
        _conexao.Open();

        Context = new ApplicationContext(new DbContextOptionsBuilder<ApplicationContext>()
            .UseSqlite(_conexao)
            .Options);
        Context.Database.EnsureCreated();

        Mapper = new MapperConfiguration(c =>
            c.AddMaps(Assembly.GetAssembly(typeof(AutoMapperProfile))!)).CreateMapper();
    }

    public CompraService CompraService(long clienteAutenticadoId) => new(
        Notificator, Mapper,
        new CompraRepository(Context),
        Autenticado(clienteAutenticadoId),
        new ClienteRepository(Context),
        new CarrinhoRepository(Context),
        new PedidoRepository(Context),
        new ProdutoRepository(Context));

    // IJwtService não é usado no Login nem no GenerateToken (o token sai da
    // JwtSettings.Key), por isso entra nulo aqui.
    public ClienteAuthService ClienteAuthService() => new(
        Notificator, Mapper,
        new ClienteRepository(Context),
        HasherCliente,
        null!,
        Options.Create(new JwtSettings { Key = new string('k', 64), ExpiracaoHoras = 8 }),
        new Argon2PasswordHasher<ConfirmacaoEmail>());

    public IPasswordHasher<Cliente> HasherCliente { get; } = new Argon2PasswordHasher<Cliente>();

    private static IHttpContextAccessor Autenticado(long clienteId) => new HttpContextAccessor
    {
        HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                new[] { new Claim(ClaimTypes.NameIdentifier, clienteId.ToString()) }, "teste"))
        }
    };

    public void Dispose()
    {
        Context.Dispose();
        _conexao.Dispose();
    }
}
