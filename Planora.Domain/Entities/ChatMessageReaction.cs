using System;

namespace Planora.Domain.Entities;

public class ChatMessageReaction : BaseEntity
{
    // BaseEntity already provides: Id, CreatedAt, IsDeleted
    // Do NOT redeclare CreatedAt here — causes CS0108 warning

    public Guid MessageId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;

    // ── Navigation ────────────────────────────────────────────────
    public ChatMessage Message { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}