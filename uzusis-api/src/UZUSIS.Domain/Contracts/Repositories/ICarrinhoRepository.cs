using UZUSIS.Domain.Entities;

namespace UZUSIS.Domain.Contracts.Repositories;

public interface ICarrinhoRepository : IBaseRepository<Carrinho>
{
    Task<Carrinho?> Obter(long id);
}