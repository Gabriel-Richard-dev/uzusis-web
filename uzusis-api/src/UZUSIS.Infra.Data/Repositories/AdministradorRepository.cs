using Microsoft.EntityFrameworkCore;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Infra.Data.Context;

namespace UZUSIS.Infra.Data.Repositories;

public class AdministradorRepository : BaseRepository<Administrador>, IAdministradorRepository
{
    public AdministradorRepository(ApplicationContext context) : base(context)
    {
    }

    public async Task<Administrador?> Obter(string email)
    {
        var admin = await 
            Context.Administradores
                .FirstOrDefaultAsync(c => c.Email.Equals(email));
        
        return admin;
    }
    
    
}