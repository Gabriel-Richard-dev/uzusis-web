using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Infra.Data.Mappings;

public class CompraPedidoMap : IEntityTypeConfiguration<CompraPedido>
{
    public void Configure(EntityTypeBuilder<CompraPedido> builder)
    {
        builder.ToTable("CompraPedido");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.CompraId);
        builder.Property(c => c.CompraId);
        
        builder.HasOne(c => c.Compra);

        
    }
}