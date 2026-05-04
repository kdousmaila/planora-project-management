using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Planora.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWithMeetToMeetingEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VisibleMemberIds",
                table: "MeetingEvents",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "WithMeet",
                table: "MeetingEvents",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VisibleMemberIds",
                table: "MeetingEvents");

            migrationBuilder.DropColumn(
                name: "WithMeet",
                table: "MeetingEvents");
        }
    }
}
