using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Planora.Application.DTOs.Backlog;
using Planora.Application.DTOs.Common;
using Planora.Application.Interfaces;
using Planora.Infrastructure.Data;
using AutoMapper;
using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using Planora.Application.DTOs.Comments;
using Planora.Domain.Entities;
namespace Planora.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BacklogController : ControllerBase
{
    private readonly IBacklogService _backlogService;
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public BacklogController(
        IBacklogService backlogService,
        ApplicationDbContext context,
        IMapper mapper)
    {
        _backlogService = backlogService;
        _context = context;
        _mapper = mapper;
    }

    /// <summary>Get backlog for a project</summary>
    [HttpGet("project/{projectId:guid}")]
    public async Task<IActionResult> GetBacklog(Guid projectId)
    {
        var result = await _backlogService.GetBacklogAsync(projectId);
        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }

    /// <summary>Get backlog item by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetBacklogItem(Guid id)
    {
        var result = await _backlogService.GetBacklogItemByIdAsync(id);
        if (result == null)
            return NotFound(ApiResponseDto<object>.ErrorResult("Backlog item not found."));
        return Ok(ApiResponseDto<BacklogItemDto>.SuccessResult(result));
    }

    /// <summary>Create a backlog item</summary>
    [HttpPost]
    public async Task<IActionResult> CreateBacklogItem([FromBody] CreateBacklogItemDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _backlogService.CreateBacklogItemAsync(dto, userId);
        return CreatedAtAction(nameof(GetBacklogItem), new { id = result.Id },
            ApiResponseDto<BacklogItemDto>.SuccessResult(result, "Backlog item created successfully."));
    }

    /// <summary>Update a backlog item</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateBacklogItem(Guid id, [FromBody] UpdateBacklogItemDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _backlogService.UpdateBacklogItemAsync(id, dto, userId);
        return Ok(ApiResponseDto<BacklogItemDto>.SuccessResult(result, "Backlog item updated successfully."));
    }

    /// <summary>Assign backlog item to a user</summary>
    [HttpPatch("{id:guid}/assign")]
    public async Task<IActionResult> AssignToUser(Guid id, [FromBody] AssignBacklogItemDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _backlogService.UpdateAssignmentAsync(id, dto.AssignedToId, userId);
        return Ok(ApiResponseDto<BacklogItemDto>.SuccessResult(result, "Assigned successfully."));
    }

    /// <summary>Update backlog item priority</summary>
    [HttpPatch("{id:guid}/priority")]
    public async Task<IActionResult> UpdatePriority(Guid id, [FromBody] int priority)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _backlogService.UpdatePriorityAsync(id, priority, userId);
        return Ok(ApiResponseDto<BacklogItemDto>.SuccessResult(result, "Priority updated successfully."));
    }

    /// <summary>Move backlog item to sprint</summary>
    [HttpPatch("{id:guid}/move-to-sprint/{sprintId:guid}")]
    public async Task<IActionResult> MoveToSprint(Guid id, Guid sprintId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _backlogService.MoveToSprintAsync(id, sprintId, userId);
        return Ok(ApiResponseDto<BacklogItemDto>.SuccessResult(result, "Item moved to sprint successfully."));
    }

    /// <summary>Update backlog item status (for Kanban drag & drop)</summary>
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _backlogService.UpdateStatusAsync(id, dto.Status, userId);
        return Ok(ApiResponseDto<BacklogItemDto>.SuccessResult(result, "Status updated successfully."));
    }

    /// <summary>Remove backlog item from sprint</summary>
    [HttpPatch("{id:guid}/remove-from-sprint")]
    public async Task<IActionResult> RemoveFromSprint(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _backlogService.RemoveFromSprintAsync(id, userId);
        return Ok(ApiResponseDto<BacklogItemDto>.SuccessResult(result, "Backlog item removed from sprint successfully."));
    }
    /// <summary>Get all backlog items for a project (including those in sprints)</summary>
    // BacklogController.cs - GetAllBacklogItemsForProject method
    [HttpGet("project/{projectId:guid}/all-items")]
    public async Task<IActionResult> GetAllBacklogItemsForProject(Guid projectId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var items = await _context.BacklogItems
            .Include(i => i.Sprint)
            .Include(i => i.AssignedTo)
            .Where(i => i.ProjectId == projectId && !i.IsDeleted)
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var total = await _context.BacklogItems.CountAsync(i => i.ProjectId == projectId && !i.IsDeleted);

        var itemDtos = items.Select(item => new BacklogItemDto
        {
            Id = item.Id,
            Title = item.Title,
            Description = item.Description,
            Priority = item.Priority,
            Status = item.Status,
            ProjectId = item.ProjectId,
            SprintId = item.SprintId,
            SprintName = item.Sprint?.Name,
            IsMovedToSprint = item.IsMovedToSprint,
            AssignedToId = item.AssignedToId,
            AssignedToName = item.AssignedTo != null
                ? $"{item.AssignedTo.FirstName} {item.AssignedTo.LastName}".Trim()
                : string.Empty,
            Complexity = item.Complexity,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        }).ToList();

        var result = new PaginatedResultDto<BacklogItemDto>
        {
            Items = itemDtos,
            TotalCount = total,
            PageNumber = page,
            PageSize = pageSize
        };

        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }

    /// <summary>Delete backlog item</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteBacklogItem(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        await _backlogService.DeleteBacklogItemAsync(id, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Backlog item deleted successfully."));
    }
    // BacklogController.cs - Add this method
    /// <summary>Get backlog items for a specific sprint</summary>
    [HttpGet("sprint/{sprintId:guid}")]
    public async Task<IActionResult> GetSprintBacklogItems(Guid sprintId)
    {
        var items = await _context.BacklogItems
            .Where(i => i.SprintId == sprintId)
            .OrderBy(i => i.CreatedAt)
            .ToListAsync();

        var itemDtos = _mapper.Map<IEnumerable<BacklogItemDto>>(items);
        return Ok(ApiResponseDto<object>.SuccessResult(itemDtos));
    }

    /// <summary>Update backlog item complexity (story points)</summary>
    [HttpPatch("{id:guid}/complexity")]
    public async Task<IActionResult> UpdateComplexity(Guid id, [FromBody] int complexity)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var result = await _backlogService.UpdateComplexityAsync(id, complexity, userId);
        return Ok(ApiResponseDto<BacklogItemDto>.SuccessResult(result, "Complexity updated successfully."));
    }
    [HttpGet("{backlogItemId:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid backlogItemId)
    {
        var comments = await _context.Comments
            .Include(c => c.Author)
            .Where(c => c.BacklogItemId == backlogItemId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new
            {
                id = c.Id,
                content = c.Content,
                authorId = c.AuthorId,
                authorName = c.Author != null
                    ? $"{c.Author.FirstName} {c.Author.LastName}".Trim()
                    : "Inconnu",
                createdAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(comments));
    }

    /// <summary>Add a comment to a backlog item</summary>
    [HttpPost("{backlogItemId:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid backlogItemId, [FromBody] CreateCommentDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var backlogItem = await _context.BacklogItems.FindAsync(backlogItemId);
        if (backlogItem == null)
            return NotFound(ApiResponseDto<object>.ErrorResult("Backlog item not found."));

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            Content = dto.Content,
            AuthorId = userId,
            BacklogItemId = backlogItemId,
            TaskId = null,          // pas une TaskItem — on laisse null
            CreatedAt = DateTime.UtcNow
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        // Reload with the author so the name can be returned
        var author = await _context.Users.FindAsync(userId);
        var result = new
        {
            id = comment.Id,
            content = comment.Content,
            authorId = comment.AuthorId,
            authorName = author != null
                ? $"{author.FirstName} {author.LastName}".Trim()
                : "Inconnu",
            createdAt = comment.CreatedAt
        };

        return Ok(ApiResponseDto<object>.SuccessResult(result, "Comment added."));
    }

    /// <summary>Delete a comment on a backlog item</summary>
    [HttpDelete("{backlogItemId:guid}/comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid backlogItemId, Guid commentId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var comment = await _context.Comments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.BacklogItemId == backlogItemId);

        if (comment == null)
            return NotFound(ApiResponseDto<object>.ErrorResult("Comment not found."));

        // Only the author or an admin can delete
        var isAdmin = User.IsInRole("Admin");
        if (comment.AuthorId != userId && !isAdmin)
            return Forbid();

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Comment deleted."));
    }
    // ===== SUBTASKS =====

    /// <summary>Get subtasks for a backlog item</summary>
    [HttpGet("{backlogItemId:guid}/subtasks")]
    public async Task<IActionResult> GetSubTasks(Guid backlogItemId)
    {
        var subTasks = await _context.SubTasks
            .Where(s => s.BacklogItemId == backlogItemId && !s.IsDeleted)
            .OrderBy(s => s.CreatedAt)
            .Select(s => new SubTaskDto
            {
                Id = s.Id,
                Title = s.Title,
                IsCompleted = s.IsCompleted,
                BacklogItemId = s.BacklogItemId,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(subTasks));
    }

    /// <summary>Create a subtask</summary>
    [HttpPost("{backlogItemId:guid}/subtasks")]
    public async Task<IActionResult> CreateSubTask(Guid backlogItemId, [FromBody] CreateSubTaskDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var backlogItem = await _context.BacklogItems.FindAsync(backlogItemId);
        if (backlogItem == null)
            return NotFound(ApiResponseDto<object>.ErrorResult("Backlog item not found."));

        var subTask = new SubTask
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            IsCompleted = false,
            BacklogItemId = backlogItemId,
            CreatedAt = DateTime.UtcNow
        };

        _context.SubTasks.Add(subTask);
        await _context.SaveChangesAsync();

        var result = new SubTaskDto
        {
            Id = subTask.Id,
            Title = subTask.Title,
            IsCompleted = subTask.IsCompleted,
            BacklogItemId = subTask.BacklogItemId,
            CreatedAt = subTask.CreatedAt
        };

        return Ok(ApiResponseDto<object>.SuccessResult(result, "Subtask created."));
    }

    /// <summary>Update a subtask (title or completion)</summary>
    [HttpPatch("{backlogItemId:guid}/subtasks/{subTaskId:guid}")]
    public async Task<IActionResult> UpdateSubTask(Guid backlogItemId, Guid subTaskId, [FromBody] UpdateSubTaskDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var subTask = await _context.SubTasks
            .FirstOrDefaultAsync(s => s.Id == subTaskId && s.BacklogItemId == backlogItemId && !s.IsDeleted);

        if (subTask == null)
            return NotFound(ApiResponseDto<object>.ErrorResult("Subtask not found."));

        if (!string.IsNullOrWhiteSpace(dto.Title))
            subTask.Title = dto.Title.Trim();

        if (dto.IsCompleted.HasValue)
            subTask.IsCompleted = dto.IsCompleted.Value;

        subTask.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var result = new SubTaskDto
        {
            Id = subTask.Id,
            Title = subTask.Title,
            IsCompleted = subTask.IsCompleted,
            BacklogItemId = subTask.BacklogItemId,
            CreatedAt = subTask.CreatedAt
        };

        return Ok(ApiResponseDto<object>.SuccessResult(result, "Subtask updated."));
    }

    /// <summary>Delete a subtask</summary>
    [HttpDelete("{backlogItemId:guid}/subtasks/{subTaskId:guid}")]
    public async Task<IActionResult> DeleteSubTask(Guid backlogItemId, Guid subTaskId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));

        var subTask = await _context.SubTasks
            .FirstOrDefaultAsync(s => s.Id == subTaskId && s.BacklogItemId == backlogItemId && !s.IsDeleted);

        if (subTask == null)
            return NotFound(ApiResponseDto<object>.ErrorResult("Subtask not found."));

        subTask.IsDeleted = true;
        subTask.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Subtask deleted."));
    }

}