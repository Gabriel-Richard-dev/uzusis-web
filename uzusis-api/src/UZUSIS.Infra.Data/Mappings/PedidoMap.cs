using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Infra.Data.Mappings;

public class PedidoMap : IEntityTypeConfiguration<Pedido>
{
    public void Configure(EntityTypeBuilder<Pedido> builder)
    {
        
        builder.ToTable("Pedido");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.ProdutoId);
        builder.Property(c => c.ClienteId);

        builder.Property(c => c.Quantidade);
        builder.Property(c => c.ValorPedido);

        builder.HasOne(c => c.Cliente)
            .WithMany(c => c.Pedidos);

        builder.HasOne(c => c.Produto)
            .WithMany(c => c.Pedidos);

        builder.HasOne(c => c.Carrinho)
            .WithMany(c => c.Pedidos);
    }
}