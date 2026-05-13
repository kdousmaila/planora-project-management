using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Planora.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyCheckIn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailyCheckIns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EnergyLevel = table.Column<int>(type: "int", nullable: false),
                    AvailableHours = table.Column<int>(type: "int", nullable: false),
                    HasBlocker = table.Column<bool>(type: "bit", nullable: false),
                    BlockerNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CheckedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyCheckIns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyCheckIns_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyCheckIns_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyCheckIns_ProjectId",
                table: "DailyCheckIns",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyCheckIns_UserId_ProjectId_CheckedAt",
                table: "DailyCheckIns",
                columns: new[] { "UserId", "ProjectId", "CheckedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyCheckIns");
        }
    }
}
