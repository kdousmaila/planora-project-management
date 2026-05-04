using System;
using System.Collections.Generic;

namespace Planora.Application.DTOs.ChatInbox;

public class CreateChatSessionDto
{
    public string Title { get; set; } = string.Empty;
}

public class SendChatMessageDto
{
    public string Content { get; set; } = string.Empty;
    public string MessageType { get; set; } = "text";
    public string? StickerUrl { get; set; }
    public string? ReplyToMessageId { get; set; }
    public List<MessageAttachmentDto>? Attachments { get; set; }
}

public class EditMessageDto
{
    public string Content { get; set; } = string.Empty;
}

public class ToggleReactionDto
{
    public string Emoji { get; set; } = string.Empty;
    public bool Add { get; set; }
}