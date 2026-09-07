using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UZUSIS.Infra.Data.Migrations
{
    /// <summary>
    /// Passa os e-mails já gravados para minúsculo, casando com a normalização
    /// que o ComoEmail() aplica na escrita. Sem isso, quem se cadastrou com
    /// "Fulano@x.com" antes desta versão não é mais encontrado num banco que
    /// compara caixa (Postgres, SQLite) — no MySQL a collation escondia isso.
    ///
    /// Antes de rodar em produção, procure e-mails que só diferem na caixa:
    ///   SELECT LOWER(Email), COUNT(*) FROM Cliente
    ///    GROUP BY LOWER(Email) HAVING COUNT(*) > 1;
    /// Não há índice único em Email, então duplicatas podem existir e viram
    /// dois cadastros com o mesmo e-mail depois desta migração.
    /// </summary>
    public partial class NormalizarEmailsMinusculos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Cliente SET Email = LOWER(Email) WHERE Email <> LOWER(Email);");
            migrationBuilder.Sql("UPDATE Administrador SET Email = LOWER(Email) WHERE Email <> LOWER(Email);");
            migrationBuilder.Sql("UPDATE ConfirmacaoEmail SET Email = LOWER(Email) WHERE Email <> LOWER(Email);");
            migrationBuilder.Sql("UPDATE RecuperacaoSenha SET Email = LOWER(Email) WHERE Email <> LOWER(Email);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // A caixa original não é recuperável. Reverter o schema não reverte
            // o dado — e nem precisa: e-mail em minúsculo funciona nos dois bancos.
        }
    }
}
