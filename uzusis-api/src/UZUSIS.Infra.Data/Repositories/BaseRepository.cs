using Microsoft.EntityFrameworkCore;
using UZUSIS.Domain.Abstractions;
using UZUSIS.Domain.Contracts;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Infra.Data.Context;

namespace UZUSIS.Infra.Data.Repositories;

public abstract class BaseRepository<T> : IBaseRepository<T> where T : Entity
{
    protected readonly ApplicationContext Context;
    private DbSet<T> _dbSet;
    
    public BaseRepository(ApplicationContext context)
    {
        Context = context;
        _dbSet = context.Set<T>();
    }

    public async Task Excluir(T entity)
    {
        _dbSet.Remove(entity);
    }

    public IUnitOfWork UnitOfWork => Context;

    public async Task<T> Adicionar(T entity)
    {
        entity.CriadoEm = DateTime.Now;
        await _dbSet.AddAsync(entity);
        return entity;
    }

    public async Task Atualizar(T entity)
    {
        entity.CriadoEm = DateTime.Now;
        _dbSet.Entry(entity).State = EntityState.Modified;
        _dbSet.Update(entity);
    }

    public async Task<List<T>> Obter()
    {
        return await _dbSet.AsNoTracking().ToListAsync();
    }
    public async Task<T?> Obter(long id)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
    }
}