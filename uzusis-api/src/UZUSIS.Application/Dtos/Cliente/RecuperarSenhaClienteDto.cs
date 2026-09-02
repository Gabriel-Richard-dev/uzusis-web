namespace UZUSIS.Application.Dtos.Cliente;

public class RecuperarSenhaClienteDto
{
    public string Email { get; set; }
    public string CodigoRecuperacao { get; set; }
    public string  NovaSenha { get; set; }
    public string ConfirmarSenha { get; set; }
}