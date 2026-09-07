using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UZUSIS.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class updateidspedido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedido_CompraPedido_CompraPedidoId",
                table: "Pedido");

            migrationBuilder.DropIndex(
                name: "IX_Pedido_CompraPedidoId",
                table: "Pedido");

            migrationBuilder.DropColumn(
                name: "CompraPedidoId",
                table: "Pedido");

            migrationBuilder.AddColumn<string>(
                name: "PedidosId",
                table: "CompraPedido",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PedidosId",
                table: "CompraPedido");

            migrationBuilder.AddColumn<long>(
                name: "CompraPedidoId",
                table: "Pedido",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pedido_CompraPedidoId",
                table: "Pedido",
                column: "CompraPedidoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pedido_CompraPedido_CompraPedidoId",
                table: "Pedido",
                column: "CompraPedidoId",
                principalTable: "CompraPedido",
                principalColumn: "Id");
        }
    }
}
