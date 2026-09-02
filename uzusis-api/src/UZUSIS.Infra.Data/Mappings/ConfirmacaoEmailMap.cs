using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Infra.Data.Mappings;

public class ConfirmacaoEmailMap : IEntityTypeConfiguration<ConfirmacaoEmail>
{
    public void Configure(EntityTypeBuilder<ConfirmacaoEmail> builder)
    {
        builder.ToTable("ConfirmacaoEmail");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Email);
        builder.Property(c => c.Codigo);
        builder.Property(c => c.Expiracao);
        builder.Property(c => c.FoiConfirmado);
        builder.Property(c => c.AtualizadoEm);
        builder.Property(c => c.CriadoEm);
        
    }
}