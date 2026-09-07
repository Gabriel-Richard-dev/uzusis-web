namespace UZUSIS.Application.Dtos.ConfirmacaoEmail;

public class ConfirmacaoEmailDto
{
    public string Email { get; set; }
    public string Codigo { get; set; }
    public DateTime Expiracao { get; set; } = DateTime.Now.AddMinutes(2);
}