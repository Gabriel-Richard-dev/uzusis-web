using Microsoft.EntityFrameworkCore;
using UZUSIS.Domain.Entities;
using Xunit;

namespace UZUSIS.Tests;

/// <summary>
/// Fluxo de compra ponta a ponta contra banco de verdade: fecha o carrinho,
/// gera a Compra com os itens, dá baixa no estoque do tamanho e esvazia o
/// carrinho. É a referência de paridade — o que uma reescrita tem que repetir.
/// </summary>
public class CompraFluxoTests
{
    [Fact]
    public async Task Comprar_carrinho_gera_compra_baixa_estoque_e_esvazia_carrinho()
    {
        using var banco = new BancoDeTeste();

        var produto = new Produto
        {
            Nome = "Camiseta",
            Descricao = "Camiseta de teste",
            Preco = 50m,
            Tamanhos = { new Tamanho { Sigla = "M", Quantidade = 10 } }
        };
        var cliente = new Cliente
        {
            Nome = "Fulano de Teste",
            Email = "fulano@example.com",
            Senha = "hash",
            CPF = "00000000000",
            Celular = "85999999999",
            DataNascimento = new DateOnly(2000, 1, 1)
        };

        banco.Context.Produtos.Add(produto);
        banco.Context.Clientes.Add(cliente);
        await banco.Context.SaveChangesAsync();

        banco.Context.Pedidos.Add(new Pedido
        {
            ClienteId = cliente.Id,
            CarrinhoId = cliente.CarrinhoId,
            ProdutoId = produto.Id,
            TamanhoId = produto.Tamanhos[0].Id,
            Sigla = "M",
            Quantidade = 2,
            ValorPedido = 100m
        });
        await banco.Context.SaveChangesAsync();
        banco.Context.ChangeTracker.Clear();

        var comprou = await banco.CompraService(cliente.Id).ComprarCarrinho();

        Assert.True(comprou, string.Join("; ", banco.Notificator.GetNotifications()));

        banco.Context.ChangeTracker.Clear();

        var compra = await banco.Context.Compras.Include(c => c.Itens).SingleAsync();
        Assert.Equal(cliente.Id, compra.ClienteId);
        Assert.Equal(100m, compra.ValorTotal);

        var item = Assert.Single(compra.Itens);
        Assert.Equal(produto.Id, item.ProdutoId);
        Assert.Equal(2, item.Quantidade);
        Assert.Equal(100m, item.ValorItem);
        Assert.Equal("M", item.Sigla);
        Assert.False(item.FoiEnviado);
        Assert.False(item.FoiRecebico);

        var tamanho = await banco.Context.Tamanhos.SingleAsync();
        Assert.Equal(8, tamanho.Quantidade);

        var pedidosNoCarrinho = await banco.Context.Pedidos
            .CountAsync(p => p.CarrinhoId == cliente.CarrinhoId);
        Assert.Equal(0, pedidosNoCarrinho);
    }
}
