using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities;

namespace UZUSIS.Infra.Data.Mappings;

public class AdministradorMap : IEntityTypeConfiguration<Administrador>
{
    public void Configure(EntityTypeBuilder<Administrador> builder)
    {

        builder.ToTable("Administrador");
        
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Email);
        builder.Property(c => c.Nome);
        builder.Property(c => c.Senha);
        builder.Property(c => c.AtualizadoEm);
        builder.Property(c => c.CriadoEm);
        builder.Property(c => c.TipoUsuario);
    }
}