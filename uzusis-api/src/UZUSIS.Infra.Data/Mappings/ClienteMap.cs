using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Infra.Data.Mappings;

public class ClienteMap : IEntityTypeConfiguration<Cliente>
{
    public void Configure(EntityTypeBuilder<Cliente> builder)
    {
        builder.ToTable("Cliente");

        
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Email);
        builder.Property(c => c.Nome);
        builder.Property(c => c.Senha);
        builder.Property(c => c.AtualizadoEm);
        builder.Property(c => c.CarrinhoId);

        builder.HasOne(c => c.Carrinho);
        
        builder.HasMany(c => c.Compras)
            .WithOne(c => c.Cliente);

        builder.HasOne(c => c.Endereco)
            .WithOne(c => c.Cliente);

    } 
}