using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NetDevPack.Security.Jwt.Core.Interfaces;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Token;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Enums;
using UZUSIS.Core.Settings;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Application.Services;

public class ClienteAuthService : BaseService, IClienteAuthService
{
    private readonly IClienteRepository _clienteRepository;
    private readonly IJwtService _jwtService;
    private readonly JwtSettings _jwtSettings;
    private readonly IPasswordHasher<Cliente> _hasher;
    private readonly IPasswordHasher<ConfirmacaoEmail> _hasherConfirmacaoEmail;

    public ClienteAuthService(INotificator notificator, IMapper mapper,
        IClienteRepository clienteRepository, IPasswordHasher<Cliente> hasher,
        IJwtService jwtService, IOptions<JwtSettings> jwtSettings, IPasswordHasher<ConfirmacaoEmail> hasherConfirmacaoEmail) : base(notificator, mapper)
    {
        _clienteRepository = clienteRepository;
        _hasher = hasher;
        _jwtService = jwtService;
        _hasherConfirmacaoEmail = hasherConfirmacaoEmail;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<TokenDto?> Login(LoginUsuarioDto loginUsuarioDto)
    {
        var cliente = await _clienteRepository.Obter(loginUsuarioDto.Email);

        if (cliente is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }

        bool senhaValida = (_hasher.VerifyHashedPassword(cliente, 
                                cliente.Senha, 
                                loginUsuarioDto.Senha) !=
                            PasswordVerificationResult.Failed);

        if (senhaValida)
            return new TokenDto
            {
                Token = await GenerateToken(cliente)
            };

        Notificator.Handle("Não foi possivel realizar o login");
        return null;
    }


    public async Task<bool> CodigoValido(string email, string codigo)
    {
        var cliente = await _clienteRepository.Obter(email);

        if (cliente is not null)
        {
            return false;
        }
        
        var confirmacao = await _clienteRepository.ObterPedidoDeConfirmacao(email);

        if (confirmacao is null)
        {
            Notificator.HandleNotFoundResource();
            return false;
        }

        bool codigoCorreto = _hasherConfirmacaoEmail
            .VerifyHashedPassword(confirmacao, confirmacao.Codigo, codigo) != PasswordVerificationResult.Failed;

        if (codigoCorreto)
        {
            confirmacao.Confirmado();
            await _clienteRepository.ConfirmacaoValidada(confirmacao);
           
            if(await _clienteRepository.UnitOfWork.Commit())
                return true;
        }
        
        Notificator.Handle("Código expirado ou incorreto");
        return false;

    }
    
    
    
    private async Task<string> GenerateToken(Cliente cliente)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_jwtSettings.Key); // Use a chave diretamente

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, cliente.Id.ToString()),
                new Claim(ClaimTypes.Role, ETipoUsuario.Cliente.ToString())
            }),
            Expires = DateTime.UtcNow.AddHours((int)_jwtSettings.ExpiracaoHoras),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256) 
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }


    public async Task<bool> RecuperarSenha(RecuperarSenhaClienteDto dto)
    {
        var pedido = await _clienteRepository.ObterPedidoRecuperacao(dto.Email);
        var cliente = await _clienteRepository.Obter(dto.Email);
        
        if (pedido is null || cliente is null) 
        {
            Notificator.HandleNotFoundResource();
            return false;
        }

        if (!dto.NovaSenha.Equals(dto.ConfirmarSenha))
        {
            Notificator.Handle("Senhas não coincidem");
            return false;
        }

        cliente.Senha = _hasher.HashPassword(cliente, dto.NovaSenha);

        await _clienteRepository.Atualizar(cliente);
        
        if (await _clienteRepository.UnitOfWork.Commit())
        {
            return true;
        }

        Notificator.Handle("Não foi possivel recuperar sua senha");
        return false;


    }
    
    
    
}