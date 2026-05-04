using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Planora.Application.DTOs.ChatInbox;
using Planora.Application.DTOs.Common;
using Planora.Application.Interfaces;
using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Planora.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/chat")]
[Authorize]
public class ChatInboxController : ControllerBase
{
    private readonly IChatInboxService _chatInboxService;

    public ChatInboxController(IChatInboxService chatInboxService)
    {
        _chatInboxService = chatInboxService;
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    // ── Sessions ──────────────────────────────────────────────────────────────

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions(Guid projectId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _chatInboxService.GetSessionsAsync(projectId, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession(Guid projectId, [FromBody] CreateChatSessionDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _chatInboxService.CreateSessionAsync(projectId, dto, userId);
        return Ok(ApiResponseDto<ChatSessionDto>.SuccessResult(result, "Conversation créée avec succès."));
    }

    [HttpGet("sessions/{sessionId:guid}")]
    public async Task<IActionResult> GetSession(Guid projectId, Guid sessionId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _chatInboxService.GetSessionByIdAsync(projectId, sessionId, userId);
        return Ok(ApiResponseDto<ChatSessionDto>.SuccessResult(result));
    }

    [HttpDelete("sessions/{sessionId:guid}")]
    public async Task<IActionResult> DeleteSession(Guid projectId, Guid sessionId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        await _chatInboxService.DeleteSessionAsync(projectId, sessionId, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Conversation supprimée."));
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    [HttpGet("sessions/{sessionId:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid projectId, Guid sessionId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _chatInboxService.GetMessagesAsync(projectId, sessionId, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }

    [HttpPost("sessions/{sessionId:guid}/messages")]
    public async Task<IActionResult> SendMessage(Guid projectId, Guid sessionId, [FromBody] SendChatMessageDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _chatInboxService.SendMessageAsync(projectId, sessionId, dto, userId);
        return Ok(ApiResponseDto<ChatMessageDto>.SuccessResult(result, "Message envoyé."));
    }

    [HttpPatch("sessions/{sessionId:guid}/messages/{messageId:guid}")]
    public async Task<IActionResult> EditMessage(
        Guid projectId, Guid sessionId, Guid messageId,
        [FromBody] EditMessageDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        // ✅ All business logic (ownership check, broadcast) delegated to service
        var result = await _chatInboxService.EditMessageAsync(projectId, sessionId, messageId, dto, userId);
        return Ok(ApiResponseDto<ChatMessageDto>.SuccessResult(result, "Message modifié."));
    }

    [HttpDelete("sessions/{sessionId:guid}/messages/{messageId:guid}")]
    public async Task<IActionResult> DeleteMessage(Guid projectId, Guid sessionId, Guid messageId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        // ✅ All business logic (PM check, broadcast) delegated to service
        await _chatInboxService.DeleteMessageAsync(projectId, sessionId, messageId, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Message supprimé."));
    }

    // ── Reactions ─────────────────────────────────────────────────────────────

    [HttpPost("sessions/{sessionId:guid}/messages/{messageId:guid}/reactions")]
    public async Task<IActionResult> ToggleReaction(
        Guid projectId, Guid sessionId, Guid messageId,
        [FromBody] ToggleReactionDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        // ✅ UserManager null-ref issue removed — service handles user lookup via DbContext
        await _chatInboxService.ToggleReactionAsync(projectId, sessionId, messageId, dto, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(null!));
    }

    // ── File upload ───────────────────────────────────────────────────────────
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadFile(Guid projectId, IFormFile file)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        if (file == null || file.Length == 0)
            return BadRequest(ApiResponseDto<object>.ErrorResult("No file provided."));

        if (file.Length > 20 * 1024 * 1024)
            return BadRequest(ApiResponseDto<object>.ErrorResult("File too large. Max 20MB."));

        // Crée le dossier si inexistant
        var uploadsDir = Path.Combine(
            Directory.GetCurrentDirectory(), "wwwroot", "uploads", "chat", projectId.ToString()
        );
        Directory.CreateDirectory(uploadsDir);

        // Nom unique pour éviter les collisions
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var safeFileName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(uploadsDir, safeFileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        var url = $"/uploads/chat/{projectId}/{safeFileName}";

        return Ok(ApiResponseDto<object>.SuccessResult(new
        {
            url,
            name = file.FileName,
            size = file.Length
        }));
    }
    [HttpGet("download")]
    public async Task<IActionResult> DownloadFile([FromQuery] string path)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        // Sécurité : empêche la traversée de répertoires
        var safePath = Path.GetFullPath(
            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", path.TrimStart('/'))
        );
        var allowedBase = Path.GetFullPath(
            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads")
        );

        if (!safePath.StartsWith(allowedBase))
            return BadRequest("Chemin non autorisé.");

        if (!System.IO.File.Exists(safePath))
            return NotFound();

        var fileName = Path.GetFileName(safePath);
        var mimeType = GetMimeType(fileName);

        var fileBytes = await System.IO.File.ReadAllBytesAsync(safePath);

        // Content-Disposition: attachment force le téléchargement
        Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");

        return File(fileBytes, mimeType, fileName);
    }

    private static string GetMimeType(string fileName)
    {
        return Path.GetExtension(fileName).ToLower() switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webm" => "audio/webm",
            ".mp3" => "audio/mpeg",
            ".txt" => "text/plain",
            ".zip" => "application/zip",
            _ => "application/octet-stream"
        };
    }
}