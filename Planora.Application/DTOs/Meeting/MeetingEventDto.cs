using System;
using System.Collections.Generic;

namespace Planora.Application.DTOs.Meeting;

public class MeetingEventDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public bool WithMeet { get; set; }                        // ← NOUVEAU
    public List<string> VisibleMemberIds { get; set; } = []; // ← NOUVEAU
    public List<PinnedMessageDto> PinnedMessages { get; set; } = [];
}