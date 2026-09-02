using AutoMapper;
using Microsoft.AspNetCore.Identity;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Administrador;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Application.Notification;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Application.Services;

public class AdministradorService : BaseService, IAdministradorService
{
    private readonly IAdministradorRepository _administradorRepository;
    private readonly IPasswordHasher<Administrador> _hasher;
    
    
    public AdministradorService(INotificator notificator, IMapper mapper, IAdministradorRepository administradorRepository, IPasswordHasher<Administrador> hasher) : base(notificator, mapper)
    {
        _administradorRepository = administradorRepository;
        _hasher = hasher;
    }

    public async Task<AdministradorDto?> Criar(AdicionarUsuarioDto addAdminDto)
    {
        var adminExists = await _administradorRepository.Obter(addAdminDto.Email);

        if (adminExists is not null)
        {
            Notificator.Handle("Email já cadastrado no sistema");
            return null;
        }
        
        var admin = Mapper.Map<Administrador>(addAdminDto);
        
        Notificator.Handle(admin.Validate());
        if(Notificator.HasNotification)
            return null;
        
        admin.Senha = _hasher.HashPassword(admin, admin.Senha);
        
        var adminCriado = await _administradorRepository.Adicionar(admin);

        if (await CommitChanges())
        {
            return Mapper.Map<AdministradorDto>(adminCriado);
        }
        
        Notificator.Handle("Não foi possivel criar a entidade");
        return null;
    }
    
    

    async Task<bool> CommitChanges() => await _administradorRepository.UnitOfWork.Commit();


    
}