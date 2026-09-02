using System.IdentityModel.Tokens.Jwt;
using System.Security.Authentication;
using System.Security.Claims;
using System.Text;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NetDevPack.Security.Jwt.Core.Interfaces;
using UZUSIS.Application.Dtos.Administrador;
using UZUSIS.Application.Dtos.Token;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Enums;
using UZUSIS.Core.Settings;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Application.Services;

public class AdminAuthService : BaseService, IAdminAuthService
{
    private readonly IJwtService _jwtService;
    private readonly JwtSettings _jwtSettings;
    private readonly IAdministradorRepository _administradorRepository;
    private readonly IPasswordHasher<Administrador> _hasher;
    public AdminAuthService(INotificator notificator, IMapper mapper, 
        IAdministradorRepository administradorRepository,
        IJwtService jwtService, IOptions<JwtSettings> jwtSettings, IPasswordHasher<Administrador> hasher) : base(notificator, mapper)
    {
        _administradorRepository = administradorRepository;
        _jwtService = jwtService;
        _hasher = hasher;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<TokenDto?> Login(LoginUsuarioDto adminDto)
    {
        var admin = await _administradorRepository.Obter(adminDto.Email)!;
        
        if (admin is null)
        {
            Notificator.Handle("Admin nao existe");
            return null;
        }

        var validation = _hasher.VerifyHashedPassword(admin, admin.Senha, adminDto.Senha)
                          != PasswordVerificationResult.Failed;
        
        if(validation)
        {
            return new TokenDto()
            {
                Token = await GenerateToken(admin)
            };
        }
        
        return null;
    }

    private async Task<string> GenerateToken(Administrador admin)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_jwtSettings.Key); // Use a chave diretamente

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
                new Claim(ClaimTypes.Role, ETipoUsuario.Administrador.ToString())
            }),
            Expires = DateTime.UtcNow.AddHours((int)_jwtSettings.ExpiracaoHoras),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256) 
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
    
}