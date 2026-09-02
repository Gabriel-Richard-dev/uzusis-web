using Microsoft.AspNetCore.Http;
using UZUSIS.Application.Dtos.Categoria;
using UZUSIS.Application.Dtos.Produto;
using UZUSIS.Core.Enums;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Application.Contracts.Services;

public interface IProdutoService
{
    Task<ProdutoDto?> Adicionar(AdicionarProdutoDto produtoDto);
    Task<List<ProdutoDto>> Obter(ECategoriaProduto? categoriaProduto = null);
    Task<ProdutoDto?> ObterPorId(long produtoId);
    Task<List<ProdutoDto>> ObterNome(string nome);
    Task<List<byte[]?>> ObterFoto(long produtoId);

    Task<ProdutoDto?> Atualizar(long produtoId, AtualizarProdutoDto atualizarProdutoDto);
    Task<List<CategoriaDto>> ObterCategorias();
    Task<List<ProdutoDto>> DashBoardAdmin();

}