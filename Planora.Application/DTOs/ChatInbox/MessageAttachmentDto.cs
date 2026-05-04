using System;
using System.Collections.Generic;

namespace Planora.Application.DTOs.ChatInbox;

public class MessageAttachmentDto
{
    public string Type { get; set; } = string.Empty;   // "image" | "file" | "audio"
    public string Url { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public long? Size { get; set; }
    public string? MimeType { get; set; }
    public string? Thumbnail { get; set; }
}

public class ReplyPreviewDto
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
}

public class ReactionDto
{
    public string Emoji { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
}