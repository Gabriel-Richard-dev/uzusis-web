using UZUSIS.Domain.Abstractions;

namespace UZUSIS.Domain.Entities;

public class Endereco : Entity
{
    public string CEP { get; set; }
    public string Rua { get; set; }
    public string Numero { get; set; }
    public string Bairro { get; set; }
    public string Cidade { get; set; }
    public string Estado { get; set; }
    
    public long ClienteId { get; set; }
    public Cliente Cliente { get; set; }
}
