using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Planora.Application.DTOs.Backlog;
using Planora.Application.DTOs.Common;
using Planora.Domain.Entities;
using Planora.Infrastructure.Data;
using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Planora.Controllers;

[ApiController]
[Route("api/backlog/{backlogItemId:guid}")]
[Authorize]
public class BacklogExtrasController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IWebHostEnvironment _env;

    public BacklogExtrasController(ApplicationDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // ════════════════════════════════════════════════════
    // TICKET LINKS
    // ════════════════════════════════════════════════════

    [HttpGet("links")]
    public async Task<IActionResult> GetLinks(Guid backlogItemId)
    {
        var links = await _db.BacklogLinks
            .Include(l => l.TargetItem)
            .Include(l => l.SourceItem)
            .Where(l => (l.SourceItemId == backlogItemId || l.TargetItemId == backlogItemId)
                        && !l.IsDeleted)
            .ToListAsync();

        var dtos = links.Select(l =>
        {
            bool isSource = l.SourceItemId == backlogItemId;
            var other = isSource ? l.TargetItem : l.SourceItem;
            int displayType = isSource ? l.LinkType : InvertLinkType(l.LinkType);
            return new BacklogLinkDto
            {
                Id = l.Id,
                SourceItemId = l.SourceItemId,
                TargetItemId = l.TargetItemId,
                TargetItemTitle = other.Title,
                TargetItemStatus = StatusLabel(other.Status),
                LinkType = displayType,
                LinkTypeLabel = LinkTypeLabel(displayType),
                CreatedAt = l.CreatedAt
            };
        });

        return Ok(ApiResponseDto<object>.SuccessResult(dtos));
    }

    [HttpPost("links")]
    public async Task<IActionResult> AddLink(Guid backlogItemId, [FromBody] CreateBacklogLinkDto dto)
    {
        if (backlogItemId == dto.TargetItemId)
            return BadRequest(ApiResponseDto<object>.ErrorResult("Cannot link a ticket to itself."));

        var exists = await _db.BacklogLinks.AnyAsync(l =>
            l.SourceItemId == backlogItemId && l.TargetItemId == dto.TargetItemId && !l.IsDeleted);
        if (exists)
            return Conflict(ApiResponseDto<object>.ErrorResult("Link already exists."));

        var link = new BacklogLink
        {
            Id = Guid.NewGuid(),
            SourceItemId = backlogItemId,
            TargetItemId = dto.TargetItemId,
            LinkType = dto.LinkType,
            CreatedAt = DateTime.UtcNow
        };

        _db.BacklogLinks.Add(link);
        await _db.SaveChangesAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(new { link.Id }, "Link created."));
    }

    [HttpDelete("links/{linkId:guid}")]
    public async Task<IActionResult> DeleteLink(Guid backlogItemId, Guid linkId)
    {
        var link = await _db.BacklogLinks.FirstOrDefaultAsync(l =>
            l.Id == linkId &&
            (l.SourceItemId == backlogItemId || l.TargetItemId == backlogItemId));

        if (link == null) return NotFound();
        link.IsDeleted = true;
        link.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Link deleted."));
    }

    // ════════════════════════════════════════════════════
    // ATTACHMENTS
    // ════════════════════════════════════════════════════

    [HttpGet("attachments")]
    public async Task<IActionResult> GetAttachments(Guid backlogItemId)
    {
        var items = await _db.BacklogAttachments
            .Include(a => a.UploadedBy)
            .Where(a => a.BacklogItemId == backlogItemId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new BacklogAttachmentDto
            {
                Id = a.Id,
                BacklogItemId = a.BacklogItemId,
                FileName = a.FileName,
                ContentType = a.ContentType,
                FileSizeBytes = a.FileSizeBytes,
                UploadedByName = a.UploadedBy != null
                    ? $"{a.UploadedBy.FirstName} {a.UploadedBy.LastName}".Trim()
                    : string.Empty,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(items));
    }

    [HttpPost("attachments")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB
    public async Task<IActionResult> UploadAttachment(Guid backlogItemId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponseDto<object>.ErrorResult("Missing file."));

        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "backlog", backlogItemId.ToString());
        Directory.CreateDirectory(uploadsDir);

        var storedName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var fullPath = Path.Combine(uploadsDir, storedName);

        await using (var stream = System.IO.File.Create(fullPath))
            await file.CopyToAsync(stream);

        var attachment = new BacklogAttachment
        {
            Id = Guid.NewGuid(),
            BacklogItemId = backlogItemId,
            FileName = file.FileName,
            StoredFileName = storedName,
            ContentType = file.ContentType,
            FileSizeBytes = file.Length,
            UploadedById = UserId,
            CreatedAt = DateTime.UtcNow
        };

        _db.BacklogAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(UserId);
        return Ok(ApiResponseDto<object>.SuccessResult(new BacklogAttachmentDto
        {
            Id = attachment.Id,
            BacklogItemId = attachment.BacklogItemId,
            FileName = attachment.FileName,
            ContentType = attachment.ContentType,
            FileSizeBytes = attachment.FileSizeBytes,
            UploadedByName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : string.Empty,
            CreatedAt = attachment.CreatedAt
        }, "Attachment added."));
    }

    [HttpGet("attachments/{attachmentId:guid}/download")]
    public async Task<IActionResult> DownloadAttachment(Guid backlogItemId, Guid attachmentId)
    {
        var attachment = await _db.BacklogAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.BacklogItemId == backlogItemId && !a.IsDeleted);

        if (attachment == null) return NotFound();

        var path = Path.Combine(_env.ContentRootPath, "uploads", "backlog",
            backlogItemId.ToString(), attachment.StoredFileName);

        if (!System.IO.File.Exists(path)) return NotFound();

        var bytes = await System.IO.File.ReadAllBytesAsync(path);
        return File(bytes, attachment.ContentType, attachment.FileName);
    }

    [HttpDelete("attachments/{attachmentId:guid}")]
    public async Task<IActionResult> DeleteAttachment(Guid backlogItemId, Guid attachmentId)
    {
        var attachment = await _db.BacklogAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.BacklogItemId == backlogItemId);

        if (attachment == null) return NotFound();
        attachment.IsDeleted = true;
        attachment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Deleted."));
    }

    // ════════════════════════════════════════════════════
    // WEB LINKS (URL / video / document / book)
    // ════════════════════════════════════════════════════

    [HttpGet("weblinks")]
    public async Task<IActionResult> GetWebLinks(Guid backlogItemId)
    {
        var items = await _db.BacklogWebLinks
            .Include(w => w.AddedBy)
            .Where(w => w.BacklogItemId == backlogItemId && !w.IsDeleted)
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new BacklogWebLinkDto
            {
                Id = w.Id,
                BacklogItemId = w.BacklogItemId,
                Url = w.Url,
                Label = w.Label,
                LinkType = w.LinkType,
                LinkTypeLabel = WebLinkTypeLabel(w.LinkType),
                AddedByName = w.AddedBy != null
                    ? $"{w.AddedBy.FirstName} {w.AddedBy.LastName}".Trim()
                    : string.Empty,
                CreatedAt = w.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(items));
    }

    [HttpPost("weblinks")]
    public async Task<IActionResult> AddWebLink(Guid backlogItemId, [FromBody] CreateBacklogWebLinkDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Url))
            return BadRequest(ApiResponseDto<object>.ErrorResult("URL is required."));

        var webLink = new BacklogWebLink
        {
            Id = Guid.NewGuid(),
            BacklogItemId = backlogItemId,
            Url = dto.Url.Trim(),
            Label = string.IsNullOrWhiteSpace(dto.Label) ? dto.Url.Trim() : dto.Label.Trim(),
            LinkType = dto.LinkType,
            AddedById = UserId,
            CreatedAt = DateTime.UtcNow
        };

        _db.BacklogWebLinks.Add(webLink);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(UserId);
        return Ok(ApiResponseDto<object>.SuccessResult(new BacklogWebLinkDto
        {
            Id = webLink.Id,
            BacklogItemId = webLink.BacklogItemId,
            Url = webLink.Url,
            Label = webLink.Label,
            LinkType = webLink.LinkType,
            LinkTypeLabel = WebLinkTypeLabel(webLink.LinkType),
            AddedByName = user != null ? $"{user.FirstName} {user.LastName}".Trim() : string.Empty,
            CreatedAt = webLink.CreatedAt
        }, "Link added."));
    }

    [HttpDelete("weblinks/{webLinkId:guid}")]
    public async Task<IActionResult> DeleteWebLink(Guid backlogItemId, Guid webLinkId)
    {
        var link = await _db.BacklogWebLinks
            .FirstOrDefaultAsync(w => w.Id == webLinkId && w.BacklogItemId == backlogItemId);

        if (link == null) return NotFound();
        link.IsDeleted = true;
        link.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Deleted."));
    }

    // ════════════════════════════════════════════════════
    // SEARCH tickets (for link dialog)
    // ════════════════════════════════════════════════════

    [HttpGet("/api/backlog/project/{projectId:guid}/search")]
    public async Task<IActionResult> SearchTickets(Guid projectId, [FromQuery] string q = "")
    {
        var query = _db.BacklogItems
            .Where(b => b.ProjectId == projectId && !b.IsDeleted);

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(b => b.Title.Contains(q));

        var results = await query
            .OrderByDescending(b => b.CreatedAt)
            .Take(20)
            .Select(b => new { b.Id, b.Title, b.Status })
            .ToListAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(results));
    }

    // ── Helpers ──────────────────────────────────────────
    private static int InvertLinkType(int t) => t switch
    {
        1 => 2,
        2 => 1,   // blocks ↔ is_blocked_by
        3 => 4,
        4 => 3,   // duplicates ↔ is_duplicated_by
        _ => t
    };

    private static string LinkTypeLabel(int t) => t switch
    {
        0 => "is related to",
        1 => "blocks",
        2 => "is blocked by",
        3 => "duplicates",
        4 => "is duplicated by",
        _ => "is related to"
    };

    private static string WebLinkTypeLabel(int t) => t switch
    {
        0 => "Web link",
        1 => "Video",
        2 => "Document",
        3 => "Book",
        _ => "Web link"
    };

    private static string StatusLabel(int s) => s switch
    {
        0 => "TO DO",
        1 => "IN PROGRESS",
        2 => "DONE",
        _ => "TO DO"
    };
    // Add this method in BacklogExtrasController.cs after the COMMITS section:

    [HttpGet("commits")]
    public async Task<IActionResult> GetCommits(Guid backlogItemId)
    {
        var commits = await _db.BacklogCommits
            .Include(c => c.CreatedBy)
            .Include(c => c.Branch)
            .Where(c => c.BacklogItemId == backlogItemId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                id = c.Id,
                backlogItemId = c.BacklogItemId,
                branchId = c.BranchId,
                branchName = c.Branch != null ? c.Branch.BranchName : string.Empty,
                hash = c.Hash,
                message = c.Message,
                createdById = c.CreatedById,
                createdByName = c.CreatedBy != null
                    ? $"{c.CreatedBy.FirstName} {c.CreatedBy.LastName}".Trim()
                    : string.Empty,
                createdAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(commits));
    }
}