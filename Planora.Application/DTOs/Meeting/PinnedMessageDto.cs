namespace Planora.Application.DTOs.Meeting;

public class PinnedMessageDto
{
    public string Id { get; set; } = string.Empty;
    public string ChatMessageId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Note { get; set; }
}