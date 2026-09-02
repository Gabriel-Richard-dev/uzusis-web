using UZUSIS.Domain.Abstractions;

namespace UZUSIS.Domain.Entities.Acessories;

public class ConfirmacaoEmail : Entity
{
    public string Email { get; set; }
    public string Codigo { get; set; }
    public DateTime Expiracao { get; set; } = DateTime.Now.AddMinutes(2);
    public bool FoiConfirmado { get; set; } = false;

    public void Confirmado()
    {
        FoiConfirmado = true;
    }
    
    
}