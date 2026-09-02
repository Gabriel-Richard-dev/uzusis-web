using System.Collections.Generic;
using UZUSIS.Domain.Abstractions;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Domain.Entities;

public class Compra : Entity
{
    public Cliente Cliente { get; set; }

    public long ClienteId { get; set; }
    public decimal ValorTotal { get; set; }
    public List<ItemCompra> Itens { get; set; }
}