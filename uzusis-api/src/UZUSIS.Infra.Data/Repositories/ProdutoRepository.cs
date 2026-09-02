using System.Collections.Immutable;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Internal;
using Microsoft.EntityFrameworkCore.Query.Internal;
using Microsoft.EntityFrameworkCore.Query.SqlExpressions;
using Microsoft.VisualBasic.CompilerServices;
using UZUSIS.Core.Enums;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Infra.Data.Context;

namespace UZUSIS.Infra.Data.Repositories;

public class ProdutoRepository : BaseRepository<Produto>, IProdutoRepository
{
    public ProdutoRepository(ApplicationContext context) : base(context)
    {
    }

    public async Task<List<Produto>> Obter(ECategoriaProduto? categoriaProduto = null, bool obterForaEstoque = false)
    {
        List<Produto> produtosForaDeEstoque = new List<Produto>();
        List<Produto> produtos;
        var prods = Context.Produtos
            .OrderByDescending(c => c.CriadoEm);

        
        if (categoriaProduto is not null)
            produtos = prods.Where(c => c.Categoria == categoriaProduto).ToList();
        else
            produtos = prods.ToList();
        
        
     
        foreach (var produto in produtos)
        {
            var tamanhos = Context.Tamanhos.Where(c 
                => c.ProdutoId == produto.Id)
                .OrderByDescending(c => c.Sigla);

            int quantidadeDeZero = 0;
            foreach (var tamanho in tamanhos)
            {
                if (tamanho.Quantidade == 0)
                    quantidadeDeZero++;
            }

            if (quantidadeDeZero == 3)
            {
                produtosForaDeEstoque.Add(produto);
            }
            produto.Tamanhos = tamanhos.ToList();
            
            
        }
        if(!obterForaEstoque)
        {
            foreach (var foraEstoque in produtosForaDeEstoque)
            {
                produtos.Remove(foraEstoque);
            }
        }
        
        return produtos;

    }


    public async Task<Produto> Obter(long id)
    {
        var produto  = await Context.Produtos
            .FirstOrDefaultAsync(c=> c.Id == id);
        
        produto.Tamanhos = Context.Tamanhos.Where(c => c.ProdutoId == produto.Id).OrderByDescending(c=> c.Sigla).ToList();
        produto.Fotos = Context.Fotos.Where(c => c.ProdutoId == produto.Id).ToList();
        
        
        return produto;

    }
    public async Task<Produto?> ObterPorId(long id)
    {
        var produto  = await Context.Produtos.FirstOrDefaultAsync(c=> c.Id == id);
        
        produto.Tamanhos = Context.Tamanhos.Where(c => c.ProdutoId == produto.Id).OrderByDescending(c=> c.Sigla).ToList();
        produto.Fotos = Context.Fotos.Where(c => c.ProdutoId == produto.Id).ToList();
        
        return produto;

    }

    public async Task<List<Produto>> ObterPorNome(string nome)
    {
        var produtos = Context.Produtos
            .OrderByDescending(c=> c.CriadoEm)
            .Where(c => c.Nome.ToUpper().Contains(nome.ToUpper())).ToList();

        foreach (var produto in produtos)
        {
            produto.Tamanhos = Context.Tamanhos.Where(c => c.ProdutoId == produto.Id)
                .OrderByDescending(c=> c.Sigla).ToList();
            produto.Fotos = Context.Fotos.Where(c => c.ProdutoId == produto.Id).ToList();
            
        }

        return produtos;
    }

    public Task<List<Produto>> DashboardAdmin()
    {
        throw new NotImplementedException();
    }
}