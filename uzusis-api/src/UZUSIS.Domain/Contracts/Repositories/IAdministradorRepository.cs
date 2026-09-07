using UZUSIS.Domain.Entities;

namespace UZUSIS.Domain.Contracts.Repositories;

public interface IAdministradorRepository : IBaseRepository<Administrador>
{
    Task<Administrador?> Obter(string email);
}