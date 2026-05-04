using System;
using System.Collections.Generic;

namespace Planora.Application.DTOs.ChatInbox;

public class ChatMessageDto
{
    public Guid Id { get; set; }
    public Guid ChatSessionId { get; set; }
    public string SenderUserId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public bool IsAssistant { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // ── Nouvelles propriétés ──────────────────────────────────────
    public bool IsDeleted { get; set; }
    public bool IsEdited { get; set; }
    public DateTime? EditedAt { get; set; }
    public string MessageType { get; set; } = "text";
    public string? StickerUrl { get; set; }
    public List<MessageAttachmentDto>? Attachments { get; set; }
    public ReplyPreviewDto? ReplyTo { get; set; }
    public List<ReactionDto> Reactions { get; set; } = new();
}
