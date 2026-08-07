using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Planora.Application.DTOs.ChatInbox;
using Planora.Application.Interfaces;
using Planora.Domain.Entities;
using Planora.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Planora.Infrastructure.Services;

public class ChatInboxService : IChatInboxService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IChatbotService _chatbotService;
    private readonly IChatNotifier _notifier;
    private readonly IWebHostEnvironment _env;

    public ChatInboxService(
        ApplicationDbContext dbContext,
        IChatbotService chatbotService,
        IChatNotifier notifier,
        IWebHostEnvironment env)
    {
        _dbContext = dbContext;
        _chatbotService = chatbotService;
        _notifier = notifier;
        _env = env;
    }

    // ── Sessions ──────────────────────────────────────────────────────────────

    public async Task<IEnumerable<ChatSessionDto>> GetSessionsAsync(Guid projectId, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        var sessions = await _dbContext.ChatSessions
            .Include(s => s.CreatedByUser)
            .Include(s => s.Messages).ThenInclude(m => m.SenderUser)
            .Include(s => s.Messages).ThenInclude(m => m.Reactions).ThenInclude(r => r.User)
            .Where(s => s.ProjectId == projectId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return sessions.Select(MapSessionDto).ToList();
    }

    public async Task<ChatSessionDto> CreateSessionAsync(Guid projectId, CreateChatSessionDto dto, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        var title = dto.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Session title is required.");

        var session = new ChatSession
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Title = title,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.ChatSessions.AddAsync(session);
        await _dbContext.SaveChangesAsync();

        var sessionDto = await GetSessionByIdAsync(projectId, session.Id, userId);
        await _notifier.SendToProjectAsync(projectId.ToString(), "SessionCreated", sessionDto);

        return sessionDto;
    }

    public async Task<ChatSessionDto> GetSessionByIdAsync(Guid projectId, Guid sessionId, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        var session = await SessionQuery()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.ProjectId == projectId)
            ?? throw new KeyNotFoundException("Chat session not found.");

        return MapSessionDto(session);
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    public async Task<IEnumerable<ChatMessageDto>> GetMessagesAsync(Guid projectId, Guid sessionId, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        var sessionExists = await _dbContext.ChatSessions
            .AnyAsync(s => s.Id == sessionId && s.ProjectId == projectId);

        if (!sessionExists)
            throw new KeyNotFoundException("Chat session not found.");

        var messages = await _dbContext.ChatMessages
            .Include(m => m.SenderUser)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Where(m => m.ChatSessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        return messages.Select(MapMessageDto).ToList();
    }

    public async Task<ChatMessageDto> SendMessageAsync(Guid projectId, Guid sessionId, SendChatMessageDto dto, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        var session = await SessionQuery()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.ProjectId == projectId)
            ?? throw new KeyNotFoundException("Chat session not found.");

        var content = dto.Content?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(content) && (dto.Attachments == null || dto.Attachments.Count == 0))
            throw new ArgumentException("Message content or attachments are required.");

        if (!string.IsNullOrEmpty(dto.ReplyToMessageId)
            && !await _dbContext.ChatMessages.AnyAsync(m => m.Id.ToString() == dto.ReplyToMessageId))
        {
            dto.ReplyToMessageId = null;
        }

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            ChatSessionId = session.Id,
            SenderUserId = userId,
            IsAssistant = false,
            Content = content,
            CreatedAt = DateTime.UtcNow,
            MessageType = dto.MessageType ?? "text",
            StickerUrl = dto.StickerUrl,
            ReplyToMessageId = dto.ReplyToMessageId,
            AttachmentsJson = dto.Attachments != null
                ? JsonSerializer.Serialize(dto.Attachments)
                : null
        };

        session.UpdatedAt = DateTime.UtcNow;
        await _dbContext.ChatMessages.AddAsync(message);
        await _dbContext.SaveChangesAsync();
        await _dbContext.Entry(message).Reference(m => m.SenderUser).LoadAsync();

        var messageDto = MapMessageDto(message);
        await _notifier.SendToSessionAsync(sessionId.ToString(), "ReceiveMessage", messageDto);

        if (ShouldInvokeAssistant(content))
        {
            var prompt = ExtractAssistantPrompt(content);
            var transcriptSession = await SessionQuery().FirstAsync(s => s.Id == session.Id);
            var transcript = BuildSessionTranscript(transcriptSession);

            // ── Extraction du contenu des fichiers joints ──
            var fileContext = new StringBuilder();

            if (dto.Attachments != null)
            {
                foreach (var att in dto.Attachments)
                {
                    if (string.IsNullOrEmpty(att.Url)) continue;

                    // L'URL ressemble à "http://localhost:5000/uploads/chat/fichier.pdf"
                    // On extrait juste le chemin relatif après le domaine
                    var uri = new Uri(att.Url);
                    var relativePath = uri.AbsolutePath.TrimStart('/');
                    var physicalPath = Path.Combine(
                        _env.WebRootPath,
                        relativePath.Replace('/', Path.DirectorySeparatorChar)
                    );

                    if (att.Url.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                    {
                        var pdfText = _chatbotService.ExtractTextFromPdf(physicalPath);
                        if (!string.IsNullOrWhiteSpace(pdfText))
                            fileContext.AppendLine($"[Contenu du PDF \"{att.Name}\"]:\n{pdfText}");
                    }
                }
            }

            // Combine transcript de la session + contenu des fichiers
            var fullContext = fileContext.Length > 0
                ? $"{transcript}\n\n{fileContext}"
                : transcript;

            var assistantResponse = await _chatbotService.GetResponseAsync(prompt, fullContext);

            if (!string.IsNullOrWhiteSpace(assistantResponse))
            {
                var assistantMessage = new ChatMessage
                {
                    Id = Guid.NewGuid(),
                    ChatSessionId = session.Id,
                    SenderUserId = null,
                    IsAssistant = true,
                    Content = assistantResponse.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    MessageType = "text"
                };

                session.UpdatedAt = assistantMessage.CreatedAt;
                await _dbContext.ChatMessages.AddAsync(assistantMessage);
                await _dbContext.SaveChangesAsync();

                var assistantDto = MapMessageDto(assistantMessage);
                await _notifier.SendToSessionAsync(sessionId.ToString(), "ReceiveMessage", assistantDto);
            }
        }

        return messageDto;
    }

    public async Task<ChatMessageDto> EditMessageAsync(Guid projectId, Guid sessionId, Guid messageId, EditMessageDto dto, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        var message = await _dbContext.ChatMessages
            .Include(m => m.SenderUser)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChatSessionId == sessionId)
            ?? throw new KeyNotFoundException("Message not found.");

        if (message.SenderUserId != userId)
            throw new UnauthorizedAccessException("You can only edit your own messages.");

        if (message.IsDeleted)
            throw new InvalidOperationException("Cannot edit a deleted message.");

        message.Content = dto.Content.Trim();
        message.IsEdited = true;
        message.EditedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        await _notifier.SendToSessionAsync(sessionId.ToString(), "MessageEdited", new
        {
            messageId = messageId.ToString(),
            content = message.Content,
            editedAt = message.EditedAt
        });

        return MapMessageDto(message);
    }

    public async Task DeleteMessageAsync(Guid projectId, Guid sessionId, Guid messageId, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        var message = await _dbContext.ChatMessages
            .FirstOrDefaultAsync(m => m.Id == messageId && m.ChatSessionId == sessionId)
            ?? throw new KeyNotFoundException("Message not found.");

        var project = await _dbContext.Projects.FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        if (message.SenderUserId != userId && project.ProjectManagerId != userId)
            throw new UnauthorizedAccessException("You don't have permission to delete this message.");

        message.IsDeleted = true;
        message.Content = "Ce message a été supprimé";
        await _dbContext.SaveChangesAsync();

        await _notifier.SendToSessionAsync(sessionId.ToString(), "MessageDeleted", messageId.ToString());
    }

    public async Task ToggleReactionAsync(Guid projectId, Guid sessionId, Guid messageId, ToggleReactionDto dto, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        if (dto.Add)
        {
            var alreadyExists = await _dbContext.ChatMessageReactions
                .AnyAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == dto.Emoji);

            if (!alreadyExists)
            {
                await _dbContext.ChatMessageReactions.AddAsync(new ChatMessageReaction
                {
                    Id = Guid.NewGuid(),
                    MessageId = messageId,
                    UserId = userId,
                    Emoji = dto.Emoji,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        else
        {
            var existing = await _dbContext.ChatMessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == dto.Emoji);
            if (existing != null)
                _dbContext.ChatMessageReactions.Remove(existing);
        }

        await _dbContext.SaveChangesAsync();

        var user = await _dbContext.Users.FindAsync(userId) as ApplicationUser;
        var fullName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : userId;

        await _notifier.SendToSessionAsync(sessionId.ToString(), "MessageReaction", new
        {
            messageId = messageId.ToString(),
            reaction = new { emoji = dto.Emoji, userId, userName = fullName },
            add = dto.Add
        });
    }

    public async Task DeleteSessionAsync(Guid projectId, Guid sessionId, string userId)
    {
        await EnsureProjectMemberAsync(projectId, userId);

        var session = await _dbContext.ChatSessions
            .Include(s => s.Messages).ThenInclude(m => m.Reactions)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.ProjectId == projectId)
            ?? throw new KeyNotFoundException("Chat session not found.");

        var project = await _dbContext.Projects.FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        if (session.CreatedByUserId != userId && project.ProjectManagerId != userId)
            throw new UnauthorizedAccessException("Only the session creator or project manager can delete it.");

        var reactions = session.Messages.SelectMany(m => m.Reactions).ToList();
        _dbContext.ChatMessageReactions.RemoveRange(reactions);
        _dbContext.ChatMessages.RemoveRange(session.Messages);
        _dbContext.ChatSessions.Remove(session);
        await _dbContext.SaveChangesAsync();

        await _notifier.SendToProjectAsync(projectId.ToString(), "SessionDeleted", sessionId.ToString());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private IQueryable<ChatSession> SessionQuery()
        => _dbContext.ChatSessions
            .Include(s => s.CreatedByUser)
            .Include(s => s.Messages).ThenInclude(m => m.SenderUser)
            .Include(s => s.Messages).ThenInclude(m => m.Reactions).ThenInclude(r => r.User);

    private async Task EnsureProjectMemberAsync(Guid projectId, string userId)
    {
        var project = await _dbContext.Projects
            .Include(p => p.Users)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        // Vérifie si l'utilisateur est admin (rôle "Admin")
        var isAdmin = await _dbContext.UserRoles
            .Join(_dbContext.Roles,
                  ur => ur.RoleId,
                  r => r.Id,
                  (ur, r) => new { ur.UserId, r.Name })
            .AnyAsync(x => x.UserId == userId && x.Name == "Admin");

        var isMember = project.Users.Any(u => u.UserId == userId);
        var isPM = project.ProjectManagerId == userId;

        if (!isMember && !isPM && !isAdmin)
            throw new UnauthorizedAccessException("Only project members can access the inbox.");
    }
    private static ChatMessageDto MapMessageDto(ChatMessage message)
    {
        List<MessageAttachmentDto>? attachments = null;
        if (!string.IsNullOrWhiteSpace(message.AttachmentsJson))
        {
            try { attachments = JsonSerializer.Deserialize<List<MessageAttachmentDto>>(message.AttachmentsJson); }
            catch { }
        }

        ReplyPreviewDto? replyTo = null;
        if (!string.IsNullOrWhiteSpace(message.ReplyToMessageId))
        {
            replyTo = new ReplyPreviewDto
            {
                Id = message.ReplyToMessageId,
                Content = string.Empty,
                SenderName = string.Empty
            };
        }

        var reactions = message.Reactions?
            .Select(r => new ReactionDto
            {
                Emoji = r.Emoji,
                UserId = r.UserId,
                UserName = r.User != null
                    ? $"{r.User.FirstName} {r.User.LastName}".Trim()
                    : r.UserId
            })
            .ToList() ?? new List<ReactionDto>();

        return new ChatMessageDto
        {
            Id = message.Id,
            ChatSessionId = message.ChatSessionId,
            SenderUserId = message.SenderUserId ?? string.Empty,
            SenderName = message.IsAssistant
                ? "Planora AI"
                : message.SenderUser != null
                    ? $"{message.SenderUser.FirstName} {message.SenderUser.LastName}".Trim()
                    : string.Empty,
            IsAssistant = message.IsAssistant,
            Content = message.Content,
            CreatedAt = message.CreatedAt,
            IsDeleted = message.IsDeleted,
            IsEdited = message.IsEdited,
            EditedAt = message.EditedAt,
            MessageType = message.MessageType ?? "text",
            StickerUrl = message.StickerUrl,
            Attachments = attachments,
            ReplyTo = replyTo,
            Reactions = reactions
        };
    }

    private static ChatSessionDto MapSessionDto(ChatSession session)
    {
        var last = session.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
        return new ChatSessionDto
        {
            Id = session.Id,
            ProjectId = session.ProjectId,
            Title = session.Title,
            CreatedByUserId = session.CreatedByUserId,
            CreatedByName = session.CreatedByUser != null
                ? $"{session.CreatedByUser.FirstName} {session.CreatedByUser.LastName}".Trim()
                : string.Empty,
            CreatedAt = session.CreatedAt,
            UpdatedAt = session.UpdatedAt,
            MessageCount = session.Messages.Count,
            LastMessageAt = last?.CreatedAt,
            LastMessageContent = last?.Content ?? string.Empty,
            LastMessageSenderName = last?.IsAssistant == true
                ? "Planora AI"
                : last?.SenderUser != null
                    ? $"{last.SenderUser.FirstName} {last.SenderUser.LastName}".Trim()
                    : string.Empty,
            LastMessageIsAssistant = last?.IsAssistant ?? false
        };
    }

    private static bool ShouldInvokeAssistant(string content)
        => content.TrimStart().StartsWith("@chat", StringComparison.OrdinalIgnoreCase);

    private static string ExtractAssistantPrompt(string content)
    {
        var trimmed = content.Trim();
        var prompt = trimmed.Length > 5 ? trimmed[5..].Trim() : string.Empty;
        return string.IsNullOrWhiteSpace(prompt)
            ? "Review the session and help the team with the issue discussed here."
            : prompt;
    }

    private static string BuildSessionTranscript(ChatSession session)
    {
        var lines = session.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m =>
            {
                var sender = m.IsAssistant ? "Planora AI"
                    : m.SenderUser != null
                        ? $"{m.SenderUser.FirstName} {m.SenderUser.LastName}".Trim()
                        : "Unknown";
                return $"[{m.CreatedAt:yyyy-MM-dd HH:mm}] {sender}: {m.Content}";
            });
        return string.Join(Environment.NewLine, lines);
    }
}