using UZUSIS.Application.Dtos.Endereco;

namespace UZUSIS.Application.Dtos.Cliente;

public class ClienteDto
{
    public string Nome { get; set; }
    public string Email { get; set; } = null!;
    public string CPF { get; set; }
    public string Celular { get; set; }
    public DateOnly DataNascimento { get; set; }
    
    public EnderecoDto Endereco { get; set; } = null!;
}