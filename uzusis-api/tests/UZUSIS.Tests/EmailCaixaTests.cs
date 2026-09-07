using Microsoft.EntityFrameworkCore;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Domain.Entities;
using UZUSIS.Infra.Data.Repositories;
using Xunit;

namespace UZUSIS.Tests;

/// <summary>
/// O cadastro grava o e-mail do jeito que o cliente digitou. No MySQL a
/// collation ignora a caixa e o login funciona de qualquer forma; em Postgres
/// ou SQLite não. Estes testes travam a normalização que faz o login funcionar
/// nos dois — é o pré-requisito da troca de banco.
/// </summary>
public class EmailCaixaTests
{
    private const string EmailComoDigitado = "Fulano@Example.COM";

    [Theory]
    [InlineData("Fulano@Example.COM")]
    [InlineData("fulano@example.com")]
    [InlineData("FULANO@EXAMPLE.COM")]
    public async Task Cliente_e_encontrado_em_qualquer_caixa(string emailDoLogin)
    {
        using var banco = new BancoDeTeste();
        banco.Context.Clientes.Add(NovoCliente(banco, EmailComoDigitado, "senha-123"));
        await banco.Context.SaveChangesAsync();
        banco.Context.ChangeTracker.Clear();

        var cliente = await new ClienteRepository(banco.Context).Obter(emailDoLogin);

        Assert.NotNull(cliente);
    }

    [Fact]
    public async Task Email_fica_gravado_em_minusculo()
    {
        using var banco = new BancoDeTeste();
        banco.Context.Clientes.Add(NovoCliente(banco, EmailComoDigitado, "senha-123"));
        await banco.Context.SaveChangesAsync();

        var gravado = await banco.Context.Database
            .SqlQueryRaw<string>("SELECT Email AS Value FROM Cliente")
            .SingleAsync();

        Assert.Equal("fulano@example.com", gravado);
    }

    [Fact]
    public async Task Login_funciona_com_caixa_diferente_do_cadastro()
    {
        using var banco = new BancoDeTeste();
        banco.Context.Clientes.Add(NovoCliente(banco, EmailComoDigitado, "senha-123"));
        await banco.Context.SaveChangesAsync();
        banco.Context.ChangeTracker.Clear();

        var token = await banco.ClienteAuthService().Login(new LoginUsuarioDto
        {
            Email = "FULANO@example.com",
            Senha = "senha-123"
        });

        Assert.False(banco.Notificator.HasNotification, string.Join("; ", banco.Notificator.GetNotifications()));
        Assert.NotNull(token);
        Assert.False(string.IsNullOrWhiteSpace(token!.Token));
    }

    private static Cliente NovoCliente(BancoDeTeste banco, string email, string senha)
    {
        var cliente = new Cliente
        {
            Nome = "Fulano de Teste",
            Email = email,
            CPF = "00000000000",
            Celular = "85999999999",
            DataNascimento = new DateOnly(2000, 1, 1)
        };
        cliente.Senha = banco.HasherCliente.HashPassword(cliente, senha);
        return cliente;
    }
}
