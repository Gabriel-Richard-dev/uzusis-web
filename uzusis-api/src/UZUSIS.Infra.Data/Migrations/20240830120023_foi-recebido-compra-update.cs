using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UZUSIS.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class foirecebidocompraupdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FoiRecebico",
                table: "ItemCompra",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FoiRecebico",
                table: "ItemCompra");
        }
    }
}
