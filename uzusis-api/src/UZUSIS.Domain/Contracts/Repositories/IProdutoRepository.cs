using UZUSIS.Core.Enums;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Domain.Contracts.Repositories;

public interface IProdutoRepository : IBaseRepository<Produto>
{
    Task<List<Produto>> Obter(ECategoriaProduto? categoriaProduto = null, bool obterForaEstoque = false);
    Task<Produto?> ObterPorId(long id);
    Task<List<Produto>> ObterPorNome(string nome);
    Task<List<Produto>> DashboardAdmin();

}