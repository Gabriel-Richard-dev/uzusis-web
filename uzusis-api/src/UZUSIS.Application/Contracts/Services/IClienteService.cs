using UZUSIS.Application.Dtos.Cliente;
using UZUSIS.Application.Dtos.Endereco;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Application.Contracts.Services;

public interface IClienteService
{
    Task<ClienteDto?> ObterCliente();
    Task<ClienteDto?> ObterCliente(long id);
    Task<ClienteDto?> AtualizarCliente(AtualizarCadastroClienteDto clienteDto);
    Task<EnderecoDto?> AtualizarEndereco(AtualizarEnderecoDto enderecoDto);
    Task<ClienteDto?> AdicionarCliente(AdicionarClienteDto usuarioDto);
    Task<bool> ResetarSenha(ResetarSenhaClienteDto resetarSenhaDto);
}