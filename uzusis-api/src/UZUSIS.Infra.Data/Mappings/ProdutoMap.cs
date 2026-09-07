using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Infra.Data.Mappings;

public class ProdutoMap : IEntityTypeConfiguration<Produto>
{
    public void Configure(EntityTypeBuilder<Produto> builder)
    {
        
        builder.ToTable("Produto");

        
        builder.HasKey(c => c.Id);

        builder.Ignore(c => c.Status);
        
        builder.Property(c => c.Nome)
            .HasColumnType("VARCHAR(120)");
        builder.Property(c => c.Preco);
        builder.Property(c => c.Categoria)
            .HasColumnType("VARCHAR(2000)");
        
        builder.Property(c => c.CriadoEm);
        builder.Property(c => c.AtualizadoEm);

        builder.HasMany(c => c.Pedidos)
            .WithOne(c => c.Produto);

        builder.HasMany(c => c.Tamanhos)
            .WithOne(c => c.Produto);

        builder.HasMany(c => c.Fotos)
            .WithOne(c => c.Produto);


    }
}