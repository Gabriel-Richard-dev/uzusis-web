using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UZUSIS.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class comprapedidoupdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedido_Compra_CompraId",
                table: "Pedido");

            migrationBuilder.RenameColumn(
                name: "CompraId",
                table: "Pedido",
                newName: "CompraPedidoId");

            migrationBuilder.RenameIndex(
                name: "IX_Pedido_CompraId",
                table: "Pedido",
                newName: "IX_Pedido_CompraPedidoId");

            migrationBuilder.CreateTable(
                name: "CompraPedido",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CompraId = table.Column<long>(type: "bigint", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompraPedido", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CompraPedido_Compra_CompraId",
                        column: x => x.CompraId,
                        principalTable: "Compra",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_CompraPedido_CompraId",
                table: "CompraPedido",
                column: "CompraId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pedido_CompraPedido_CompraPedidoId",
                table: "Pedido",
                column: "CompraPedidoId",
                principalTable: "CompraPedido",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedido_CompraPedido_CompraPedidoId",
                table: "Pedido");

            migrationBuilder.DropTable(
                name: "CompraPedido");

            migrationBuilder.RenameColumn(
                name: "CompraPedidoId",
                table: "Pedido",
                newName: "CompraId");

            migrationBuilder.RenameIndex(
                name: "IX_Pedido_CompraPedidoId",
                table: "Pedido",
                newName: "IX_Pedido_CompraId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pedido_Compra_CompraId",
                table: "Pedido",
                column: "CompraId",
                principalTable: "Compra",
                principalColumn: "Id");
        }
    }
}
