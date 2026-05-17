using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Planora.Application.DTOs.Meeting;
using Planora.Application.Interfaces;
using Planora.Domain.Entities;
using Planora.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Planora.Infrastructure.Services;

public class MeetingService : IMeetingService
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public MeetingService(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    public async Task<PinnedMessageDto> PinMessageAsync(Guid projectId, PinMessageDto dto, string userId)
    {
        var msg = await _db.ChatMessages.FindAsync(Guid.Parse(dto.ChatMessageId))
            ?? throw new Exception("Message introuvable");

        var pinned = new PinnedMessage
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            ChatMessageId = dto.ChatMessageId,
            Content = msg.Content,
            Note = dto.Note,
            PinnedByUserId = userId,
            PinnedAt = DateTime.UtcNow
        };

        _db.PinnedMessages.Add(pinned);
        await _db.SaveChangesAsync();

        return new PinnedMessageDto
        {
            Id = pinned.Id.ToString(),
            ChatMessageId = pinned.ChatMessageId,
            Content = pinned.Content,
            Note = pinned.Note
        };
    }

    public async Task UnpinMessageAsync(Guid projectId, Guid pinnedMessageId, string userId)
    {
        var pinned = await _db.PinnedMessages.FindAsync(pinnedMessageId)
            ?? throw new Exception("Pinned message not found");
        _db.PinnedMessages.Remove(pinned);
        await _db.SaveChangesAsync();
    }

    public async Task<List<PinnedMessageDto>> GetPinnedMessagesAsync(Guid projectId, string userId)
    {
        return await _db.PinnedMessages
            .Where(p => p.ProjectId == projectId)
            .Select(p => new PinnedMessageDto
            {
                Id = p.Id.ToString(),
                ChatMessageId = p.ChatMessageId,
                Content = p.Content,
                Note = p.Note
            })
            .ToListAsync();
    }

    public async Task<MeetingEventDto> CreateMeetingAsync(Guid projectId, CreateMeetingDto dto, string userId)
    {
        var meeting = new MeetingEvent
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Title = dto.Title,
            ScheduledAt = dto.ScheduledAt,
            CreatedByUserId = userId,
            WithMeet = dto.WithMeet,
            VisibleMemberIds = string.Join(',', dto.VisibleMemberIds)
        };

        foreach (var pinnedId in dto.PinnedMessageIds)
        {
            meeting.PinnedMessages.Add(new MeetingPinnedMessage
            {
                MeetingEventId = meeting.Id,
                PinnedMessageId = Guid.Parse(pinnedId)
            });
        }

        _db.MeetingEvents.Add(meeting);
        await _db.SaveChangesAsync();

        return new MeetingEventDto
        {
            Id = meeting.Id.ToString(),
            Title = meeting.Title,
            ScheduledAt = meeting.ScheduledAt,
            WithMeet = meeting.WithMeet,
            VisibleMemberIds = string.IsNullOrEmpty(meeting.VisibleMemberIds)
                ? []
                : [.. meeting.VisibleMemberIds.Split(',')],
            PinnedMessages = []
        };
    }

    public async Task<List<MeetingEventDto>> GetMeetingsAsync(Guid projectId, string userId)
    {
        // ✅ Case-insensitive search
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == userId);

        var roles = user != null
            ? await _userManager.GetRolesAsync(user)
            : (IList<string>)[];

        bool isAdminOrPM = roles.Contains("Admin") || roles.Contains("ProjectManager");

        // ✅ Log pour confirmer
        Console.WriteLine($"[GetMeetings] userId='{userId}' | isAdminOrPM={isAdminOrPM} | user found={user != null}");

        var meetings = await _db.MeetingEvents
            .Where(m => m.ProjectId == projectId)
            .Select(m => new
            {
                m.Id,
                m.Title,
                m.ScheduledAt,
                m.WithMeet,
                m.VisibleMemberIds
            })
            .ToListAsync();

        foreach (var m in meetings)
            Console.WriteLine($"  meeting='{m.Title}' | visibleIds='{m.VisibleMemberIds}'");

        var filtered = isAdminOrPM
            ? meetings
            : meetings.Where(m =>
            {
                // Vide = visible par tous
                if (string.IsNullOrWhiteSpace(m.VisibleMemberIds))
                    return true;

                // ✅ Case-insensitive comparison
                var ids = m.VisibleMemberIds
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(id => id.Trim().ToLowerInvariant());

                var match = ids.Contains(userId.Trim().ToLowerInvariant());
                Console.WriteLine($"  → '{m.Title}' | ids=[{string.Join(",", ids)}] | userId='{userId.ToLowerInvariant()}' | match={match}");
                return match;
            }).ToList();

        Console.WriteLine($"[GetMeetings] {filtered.Count}/{meetings.Count} meetings returned");

        return filtered.Select(m => new MeetingEventDto
        {
            Id = m.Id.ToString(),
            Title = m.Title,
            ScheduledAt = m.ScheduledAt,
            WithMeet = m.WithMeet,
            VisibleMemberIds = string.IsNullOrEmpty(m.VisibleMemberIds)
                ? []
                : m.VisibleMemberIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                     .Select(id => id.Trim())
                                     .ToList(),
            PinnedMessages = []
        }).ToList();
    }
}