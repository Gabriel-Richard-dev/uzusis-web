namespace UZUSIS.Domain.Contracts;

public interface IUnitOfWork
{
    Task<bool> Commit();
}