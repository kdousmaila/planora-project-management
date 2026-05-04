using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Planora.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMeetingAndPinned : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MeetingEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PinnedMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChatMessageId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PinnedByUserId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PinnedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PinnedMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MeetingPinnedMessage",
                columns: table => new
                {
                    MeetingEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PinnedMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingPinnedMessage", x => new { x.MeetingEventId, x.PinnedMessageId });
                    table.ForeignKey(
                        name: "FK_MeetingPinnedMessage_MeetingEvents_MeetingEventId",
                        column: x => x.MeetingEventId,
                        principalTable: "MeetingEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingPinnedMessage_PinnedMessages_PinnedMessageId",
                        column: x => x.PinnedMessageId,
                        principalTable: "PinnedMessages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingPinnedMessage_PinnedMessageId",
                table: "MeetingPinnedMessage",
                column: "PinnedMessageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeetingPinnedMessage");

            migrationBuilder.DropTable(
                name: "MeetingEvents");

            migrationBuilder.DropTable(
                name: "PinnedMessages");
        }
    }
}
