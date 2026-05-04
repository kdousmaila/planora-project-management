using Planora.Application.DTOs.ChatInbox;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Planora.Application.Interfaces;

public interface IChatInboxService
{
    Task<IEnumerable<ChatSessionDto>> GetSessionsAsync(Guid projectId, string userId);
    Task<ChatSessionDto> CreateSessionAsync(Guid projectId, CreateChatSessionDto dto, string userId);
    Task<ChatSessionDto> GetSessionByIdAsync(Guid projectId, Guid sessionId, string userId);
    Task<IEnumerable<ChatMessageDto>> GetMessagesAsync(Guid projectId, Guid sessionId, string userId);
    Task<ChatMessageDto> SendMessageAsync(Guid projectId, Guid sessionId, SendChatMessageDto dto, string userId);
    Task<ChatMessageDto> EditMessageAsync(Guid projectId, Guid sessionId, Guid messageId, EditMessageDto dto, string userId);
    Task DeleteMessageAsync(Guid projectId, Guid sessionId, Guid messageId, string userId);
    Task ToggleReactionAsync(Guid projectId, Guid sessionId, Guid messageId, ToggleReactionDto dto, string userId);
    Task DeleteSessionAsync(Guid projectId, Guid sessionId, string userId);
}