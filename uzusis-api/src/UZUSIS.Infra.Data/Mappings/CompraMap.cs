using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Infra.Data.Mappings;

public class CompraMap : IEntityTypeConfiguration<Compra>
{
    public void Configure(EntityTypeBuilder<Compra> builder)
    {
        builder.ToTable("Compra");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.ValorTotal);

        builder.HasOne(c => c.Cliente)
            .WithMany(c => c.Compras);


        builder.HasMany(c => c.Itens);
    }
}