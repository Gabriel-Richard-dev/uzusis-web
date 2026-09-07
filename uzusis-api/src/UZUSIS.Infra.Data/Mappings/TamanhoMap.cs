using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Infra.Data.Mappings;

public class TamanhoMap : IEntityTypeConfiguration<Tamanho>
{
    public void Configure(EntityTypeBuilder<Tamanho> builder)
    {
        
        builder.ToTable("Tamanho");

        
        builder.HasKey(c => c.Id);
        
        builder.Property(c => c.Sigla);
        builder.Property(c => c.Quantidade);

        builder.Property(c => c.ProdutoId);

        
        builder.HasOne(c => c.Produto)
            .WithMany(c => c.Tamanhos);
    }
}