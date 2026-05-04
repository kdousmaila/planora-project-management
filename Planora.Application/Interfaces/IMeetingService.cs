using Planora.Application.DTOs.Meeting;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Planora.Application.Interfaces;

public interface IMeetingService
{
    Task<PinnedMessageDto> PinMessageAsync(Guid projectId, PinMessageDto dto, string userId);
    Task UnpinMessageAsync(Guid projectId, Guid pinnedMessageId, string userId);
    Task<List<PinnedMessageDto>> GetPinnedMessagesAsync(Guid projectId, string userId);
    Task<MeetingEventDto> CreateMeetingAsync(Guid projectId, CreateMeetingDto dto, string userId);
    Task<List<MeetingEventDto>> GetMeetingsAsync(Guid projectId, string userId);
}