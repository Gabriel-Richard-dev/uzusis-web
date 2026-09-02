using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Infra.Data.Mappings;

public class FotoMap : IEntityTypeConfiguration<Foto>
{
    public void Configure(EntityTypeBuilder<Foto> builder)
    {

        builder.ToTable("Foto");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.FotoUrl);

        builder.HasOne(c => c.Produto)
            .WithMany(c => c.Fotos);

    }
}