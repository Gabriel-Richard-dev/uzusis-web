using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UZUSIS.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class Pedido_Update : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedido_Compra_CompraId",
                table: "Pedido");

            migrationBuilder.AlterColumn<long>(
                name: "CompraId",
                table: "Pedido",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<long>(
                name: "TamanhoId",
                table: "Pedido",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddForeignKey(
                name: "FK_Pedido_Compra_CompraId",
                table: "Pedido",
                column: "CompraId",
                principalTable: "Compra",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedido_Compra_CompraId",
                table: "Pedido");

            migrationBuilder.DropColumn(
                name: "TamanhoId",
                table: "Pedido");

            migrationBuilder.AlterColumn<long>(
                name: "CompraId",
                table: "Pedido",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Pedido_Compra_CompraId",
                table: "Pedido",
                column: "CompraId",
                principalTable: "Compra",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
