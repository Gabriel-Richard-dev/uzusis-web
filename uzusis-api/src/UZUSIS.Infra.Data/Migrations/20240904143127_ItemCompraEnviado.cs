using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UZUSIS.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class ItemCompraEnviado : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FoiEnviado",
                table: "ItemCompra",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FoiEnviado",
                table: "ItemCompra");
        }
    }
}
