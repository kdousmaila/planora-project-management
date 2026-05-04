using System;
using System.Collections.Generic;

namespace Planora.Application.DTOs.Meeting;

public class CreateMeetingDto
{
    public string Title { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public List<string> PinnedMessageIds { get; set; } = [];
    public bool WithMeet { get; set; }                // ← NOUVEAU
    public List<string> VisibleMemberIds { get; set; } = []; // ← NOUVEAU
}