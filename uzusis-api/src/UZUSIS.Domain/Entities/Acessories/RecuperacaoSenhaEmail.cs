using UZUSIS.Domain.Abstractions;

namespace UZUSIS.Domain.Entities.Acessories;

public class RecuperacaoSenhaEmail : Entity
{
    public string Email { get; set; }
    public string Codigo { get; set; }
    public DateTime Expiracao { get; set; } = DateTime.Now.AddMinutes(5);
    public bool FoiConfirmado { get; set; } = false;

    public void Confirmado()
    {
        FoiConfirmado = true;
    }

}