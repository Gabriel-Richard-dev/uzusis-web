using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UZUSIS.Domain.Entities.Acessories;

namespace UZUSIS.Infra.Data.Mappings;

public class ItemCompraMap : IEntityTypeConfiguration<ItemCompra>
{
    public void Configure(EntityTypeBuilder<ItemCompra> builder)
    {
        builder.ToTable("ItemCompra");
        
        builder.HasKey(x => x.Id);
        
        builder.Property(x => x.Id).ValueGeneratedOnAdd();
        builder.Property(c => c.ProdutoId);
        builder.Property(c => c.CompraId);
        builder.Property(c => c.ClienteId);
        builder.Property(c => c.Quantidade);
        builder.Property(c => c.ValorItem);
        builder.Property(c => c.FoiRecebico);
        builder.Property(c => c.FoiEnviado);
        builder.Property(c => c.Sigla);

        builder.HasOne(c => c.Compra);
    }
}