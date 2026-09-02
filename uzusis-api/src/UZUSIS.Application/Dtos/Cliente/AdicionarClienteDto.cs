using UZUSIS.Application.Dtos.Endereco;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Application.Dtos.Cliente;

public class AdicionarClienteDto : AdicionarUsuarioDto
{
    public string Nome { get; set; }
    public string Email { get; set; }
    public string Senha { get; set; }
    public string CPF { get; set; }
    public string Celular { get; set; }
    public DateOnly DataNascimento { get; set; }
    public EnderecoDto Endereco { get; set; }
}