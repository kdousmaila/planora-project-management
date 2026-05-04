// Domain/Entities/PinnedMessage.cs
using System;

// PinnedMessage.cs
public class PinnedMessage
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ChatMessageId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string PinnedByUserId { get; set; } = string.Empty;
    public DateTime PinnedAt { get; set; }
}