namespace UZUSIS.Application.Dtos.Cliente;

public class AtualizarCadastroClienteDto
{
    public string? Nome { get; set; }
    public string? CPF { get; set; }
    public string? Celular { get; set; }
    public DateOnly? DataNascimento { get; set; }
}