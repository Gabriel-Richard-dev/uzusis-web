using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Endereco;
using UZUSIS.Application.Notification;
using UZUSIS.Core.Extensions;
using UZUSIS.Domain.Contracts.Repositories;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Application.Services;

public class ClienteService : BaseService, IClienteService
{

    private readonly IClienteRepository _clienteRepository;
    private readonly ICarrinhoRepository _carrinhoRepository;
    private readonly IPasswordHasher<Cliente> _hasher;
    private readonly IPasswordHasher<ConfirmacaoEmail> _hasherConfirmacao;
    private readonly IHttpContextAccessor _httpContext;
       
    public ClienteService(INotificator notificator, IMapper mapper, IAdministradorRepository administradorRepository, IClienteRepository clienteRepository, ICarrinhoRepository carrinhoRepository, IPasswordHasher<Cliente> hasher, IHttpContextAccessor httpContext, IPasswordHasher<ConfirmacaoEmail> hasherConfirmacao) : base(notificator, mapper)
    {
        _clienteRepository = clienteRepository;
        _carrinhoRepository = carrinhoRepository;
        _hasher = hasher;
        _httpContext = httpContext;
        _hasherConfirmacao = hasherConfirmacao;
    }


    public async Task<bool> ValidarCodigoConfirmacao(string email, string codigoConfirmacao)
    {
        var confirmacao = await _clienteRepository.ObterPedidoDeConfirmacao(email);

        if (confirmacao is null)
            return false;

        bool confirmacaoValida =
            _hasherConfirmacao.VerifyHashedPassword(confirmacao, confirmacao.Codigo, codigoConfirmacao) !=
            PasswordVerificationResult.Failed;
        
        if (confirmacaoValida)
        {
            confirmacao.Confirmado();
            await _clienteRepository.ConfirmacaoValidada(confirmacao);
            await _clienteRepository.UnitOfWork.Commit();
            return true;
        }
        return false;
    }

    public async Task<ClienteDto?> AtualizarCliente(AtualizarCadastroClienteDto clienteDto)
    {
        
        var clienteId = _httpContext.ObterUsuarioId();

        if (clienteId is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }
        
        var cliente = await _clienteRepository.Obter((long)clienteId!);

        if (cliente is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }
    
        if (clienteDto.Nome is not null)
            cliente.Nome = clienteDto.Nome;
        if (clienteDto.CPF is not null)
            cliente.CPF = clienteDto.CPF;
        if (clienteDto.DataNascimento is not null)
            cliente.DataNascimento = (DateOnly)clienteDto.DataNascimento;
        if (clienteDto.Celular is not null)
            cliente.Celular = clienteDto.Celular;
        

        await _clienteRepository.Atualizar(cliente);
        if (await CommitChanges())
        {
            return Mapper.Map<ClienteDto>(cliente);
        }

        Notificator.Handle("Não foi possível atualizar o cliente");
        return null;
    }

    public async Task<EnderecoDto?> AtualizarEndereco(AtualizarEnderecoDto enderecoDto)
    {
        var userId = _httpContext.ObterUsuarioId();
        
        if (userId is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }
        
        var cliente = await _clienteRepository.Obter((long)userId!);

        if (cliente is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }

        if (enderecoDto.CEP is not null)
            cliente.Endereco.CEP = enderecoDto.CEP;
        if (enderecoDto.Rua is not null)
            cliente.Endereco.Rua = enderecoDto.Rua;
        if (enderecoDto.Numero is not null)
            cliente.Endereco.Numero = enderecoDto.Numero;
        if (enderecoDto.Bairro is not null)
            cliente.Endereco.Bairro = enderecoDto.Bairro;
        if (enderecoDto.Cidade is not null)
            cliente.Endereco.Cidade = enderecoDto.Cidade;
        if (enderecoDto.Estado is not null)
            cliente.Endereco.Estado = enderecoDto.Estado;

        await _clienteRepository.Atualizar(cliente);
        
        if (await CommitChanges())
            return Mapper.Map<EnderecoDto>(cliente.Endereco);
    


        Notificator.Handle("Não foi possivel atualizar o endereco");
        return null;

    }

    public async Task<ClienteDto?> AdicionarCliente(AdicionarClienteDto usuarioDto)
    {
        
        var userExists = (await _clienteRepository.Obter(usuarioDto.Email));
        
        if (userExists is not null)
        {
            Notificator.Handle("Usuario com um email cadastrado já existente.");
            return null;
        }
        
        
        var cliente = Mapper.Map<Cliente>(usuarioDto);
        if (cliente is null)
        {
            Notificator.HandleNotFoundResource();
            return null;
        }

        Endereco endereco = Mapper.Map<Endereco>(usuarioDto.Endereco);

        cliente.Endereco = endereco;

        Notificator.Handle(cliente.Validate());
        if(Notificator.HasNotification)
            return null;
        
        cliente.Senha = _hasher.HashPassword(cliente, cliente.Senha);
        var clienteDb = await _clienteRepository.Adicionar(cliente);
        
        
        if (await CommitChanges())
        {
            return Mapper.Map<ClienteDto>(usuarioDto);
        }
        
        Notificator.Handle("Não foi possivel criar o usuário");
        return null;
    }

    public async Task<bool> ResetarSenha(ResetarSenhaClienteDto resetarSenhaDto)
    {
        var clienteId = _httpContext.ObterUsuarioId();

        if (clienteId is null)
        {
            Notificator.HandleNotFoundResource();
            return false;
        }

        var cliente = await _clienteRepository.Obter((long)clienteId);

        if (cliente is null)
        {
            Notificator.HandleNotFoundResource();
            return false;
        }
        
        if (!resetarSenhaDto.NovaSenha.Equals(resetarSenhaDto.ConfirmarSenha))
        {
            Notificator.Handle("Senhas não coincidem");
            return false;
        }

        cliente.Senha = _hasher.HashPassword(cliente, resetarSenhaDto.NovaSenha);

        await _clienteRepository.Atualizar(cliente);
        
        if (await _clienteRepository.UnitOfWork.Commit())
        {
            return true;
        }

        Notificator.Handle("Não foi possivel recuperar sua senha");
        return false;         
        
    }

    public async Task<ClienteDto?> ObterCliente()
    {
        long id = await ObterIdUsuarioAutenticado();

        if (Notificator.HasNotification)
        {
            return null;
        }
        
        var cliente = await _clienteRepository.Obter(id);
        if (cliente == null)
            return null;

        return Mapper.Map<ClienteDto>(cliente);
    }   
    
    public async Task<ClienteDto?> ObterCliente(long id)
    {
        var cliente = await _clienteRepository.Obter(id);
        if (cliente == null)
            return null;

        return Mapper.Map<ClienteDto>(cliente);
    }
       
    private async Task<long> ObterIdUsuarioAutenticado()
    {
        if (_httpContext is null)
        {
            Notificator.Handle("Impossivel encontrar o httpContext");
            return 0;
        }

        long? usuarioId = _httpContext.ObterUsuarioId();
        if (usuarioId == null)
        {
            Notificator.HandleNotFoundResource();
            return 0;
        }

        long id = usuarioId.Value;

        return id;
    }
    private async Task<bool> CommitChanges() => await _clienteRepository.UnitOfWork.Commit();

}



