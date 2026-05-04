using System;
using System.Collections.Generic;

namespace Planora.Application.DTOs.ChatInbox;

public class ChatSessionDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int MessageCount { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public string LastMessageContent { get; set; } = string.Empty;
    public string LastMessageSenderName { get; set; } = string.Empty;
    public bool LastMessageIsAssistant { get; set; }
}