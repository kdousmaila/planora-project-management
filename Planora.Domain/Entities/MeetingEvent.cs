// Domain/Entities/MeetingEvent.cs
using System;
using System.Collections.Generic;

public class MeetingEvent
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public bool WithMeet { get; set; }                       
    public string VisibleMemberIds { get; set; } = string.Empty; 
    public List<MeetingPinnedMessage> PinnedMessages { get; set; } = [];
}

public class MeetingPinnedMessage
{
    public Guid MeetingEventId { get; set; }
    public Guid PinnedMessageId { get; set; }
    public PinnedMessage PinnedMessage { get; set; } = null!;
}