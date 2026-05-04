using System;
using System.Collections.Generic;

namespace Planora.Domain.Entities;

public class ChatSession : BaseEntity
{
    // BaseEntity already provides: Id, IsDeleted, CreatedAt, UpdatedAt
    // Do NOT redeclare UpdatedAt here — causes CS0108

    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;

    // ── Navigation ────────────────────────────────────────────────
    public Project Project { get; set; } = null!;
    public ApplicationUser CreatedByUser { get; set; } = null!;
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}