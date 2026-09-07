using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Infra.Data.Mappings;
 
public class EnderecoMap : IEntityTypeConfiguration<Endereco>
{
    public void Configure(EntityTypeBuilder<Endereco> builder)
    {
        
        builder.ToTable("Endereco");

        builder.HasKey(c => c.Id);
        
        builder.Property(c => c.CEP);
        builder.Property(c => c.Rua);

        builder.HasOne(c => c.Cliente)
            .WithOne(c => c.Endereco)
            .HasForeignKey<Endereco>( c => c.ClienteId);
        
        
    }
}