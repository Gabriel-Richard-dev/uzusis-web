using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace UZUSIS.Infra.Data.Mappings;

public static class EmailPropertyExtension
{
    /// <summary>
    /// Grava e compara e-mail sempre em minúsculo. O MySQL ignora a caixa por
    /// causa da collation (utf8mb4_..._ci), então "Fulano@x.com" e
    /// "fulano@x.com" logam igual hoje. Postgres e SQLite comparam caixa,
    /// e sem essa normalização o login quebraria na migração.
    /// O conversor vale para a escrita e para o parâmetro da consulta, então
    /// os repositórios continuam usando Email.Equals(email) sem alteração.
    /// </summary>
    public static PropertyBuilder<string> ComoEmail(this PropertyBuilder<string> builder)
        => builder.HasConversion(email => email.ToLowerInvariant(), email => email);
}
