using System;
using System.Collections.Generic;

namespace Planora.Domain.Entities;

public class ChatMessage : BaseEntity
{
    // BaseEntity already provides: Id, IsDeleted, CreatedAt, UpdatedAt
    // Do NOT redeclare IsDeleted here — causes CS0108

    public Guid ChatSessionId { get; set; }
    public string? SenderUserId { get; set; }
    public bool IsAssistant { get; set; }
    public string Content { get; set; } = string.Empty;

    // ── Rich messaging properties ─────────────────────────────────
    public bool IsEdited { get; set; } = false;
    public DateTime? EditedAt { get; set; }
    public string MessageType { get; set; } = "text";   // "text" | "sticker" | "file" | "image" | "audio"
    public string? StickerUrl { get; set; }
    public string? AttachmentsJson { get; set; }        // JSON: List<MessageAttachmentDto>
    public string? ReplyToMessageId { get; set; }       // Parent message Id (string)

    // ── Navigation ────────────────────────────────────────────────
    public ChatSession ChatSession { get; set; } = null!;
    public ApplicationUser? SenderUser { get; set; }
    public ICollection<ChatMessageReaction> Reactions { get; set; } = new List<ChatMessageReaction>();
}