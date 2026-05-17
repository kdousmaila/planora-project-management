using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Planora.Application.DTOs.Sprints;
using Planora.Application.Interfaces;
using Planora.Domain.Entities;
using Planora.Domain.Enums;
using Planora.Domain.Interfaces;
using Planora.Infrastructure.Data;

namespace Planora.Infrastructure.Services;

public class SprintService : ISprintService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ApplicationDbContext _dbContext;

    public SprintService(IUnitOfWork unitOfWork, IMapper mapper, ApplicationDbContext dbContext)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _dbContext = dbContext;
    }

    public async Task<IEnumerable<SprintDto>> GetSprintsAsync(Guid projectId)
    {
        var sprints = await _unitOfWork.Sprints.FindAsync(s => s.ProjectId == projectId);
        return sprints.Select(s =>
        {
            var dto = _mapper.Map<SprintDto>(s);
            var tasks = s.Tasks.ToList();
            dto.TasksCount = tasks.Count;
            dto.CompletedTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
            dto.ProgressPercentage = tasks.Count > 0
                ? Math.Round((double)dto.CompletedTasksCount / tasks.Count * 100, 2)
                : 0;
            return dto;
        });
    }

    public async Task<SprintDto?> GetSprintByIdAsync(Guid id)
    {
        var sprint = await _unitOfWork.Sprints.GetByIdAsync(id);
        if (sprint == null) return null;

        var dto = _mapper.Map<SprintDto>(sprint);
        var tasks = sprint.Tasks.ToList();
        dto.TasksCount = tasks.Count;
        dto.CompletedTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        dto.ProgressPercentage = tasks.Count > 0
            ? Math.Round((double)dto.CompletedTasksCount / tasks.Count * 100, 2)
            : 0;
        return dto;
    }

    public async Task<SprintDto> CreateSprintAsync(CreateSprintDto dto, string currentUserId)
    {
        await EnsureProjectMemberAccessAsync(dto.ProjectId, currentUserId);

        var sprint = _mapper.Map<Sprint>(dto);
        sprint.Id = Guid.NewGuid();
        sprint.CreatedAt = DateTime.UtcNow;
        sprint.Status = Domain.Enums.SprintStatus.Planning; // ✅ Set explicitly

        await _unitOfWork.Sprints.AddAsync(sprint);
        await _unitOfWork.SaveChangesAsync();

        var result = _mapper.Map<SprintDto>(sprint);
        result.TasksCount = 0;
        result.CompletedTasksCount = 0;
        result.ProgressPercentage = 0;
        return result;
    }

    public async Task<SprintDto> UpdateSprintAsync(Guid id, UpdateSprintDto dto, string currentUserId)
    {
        var sprint = await _unitOfWork.Sprints.GetByIdAsync(id) ?? throw new KeyNotFoundException("Sprint not found.");
        await EnsureProjectMemberAccessAsync(sprint.ProjectId, currentUserId);

        if (!string.IsNullOrEmpty(dto.Name))
            sprint.Name = dto.Name;

        if (dto.Goal != null)
            sprint.Goal = dto.Goal;

        if (dto.StartDate.HasValue)
            sprint.StartDate = dto.StartDate.Value;

        if (dto.EndDate.HasValue)
            sprint.EndDate = dto.EndDate.Value;

        if (dto.Status.HasValue)
        {
            sprint.Status = (Domain.Enums.SprintStatus)dto.Status.Value; // ✅ Set explicitly
        }

        sprint.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Sprints.Update(sprint);
        await _unitOfWork.SaveChangesAsync();

        var result = _mapper.Map<SprintDto>(sprint);
        var tasks = sprint.Tasks.ToList();
        result.TasksCount = tasks.Count;
        result.CompletedTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        result.ProgressPercentage = tasks.Count > 0
            ? Math.Round((double)result.CompletedTasksCount / tasks.Count * 100, 2)
            : 0;
        return result;
    }

    public async Task<SprintDto> CloseSprintAsync(Guid id, string currentUserId)
    {
        var sprint = await _unitOfWork.Sprints.GetByIdAsync(id) ?? throw new KeyNotFoundException("Sprint not found.");
        await EnsureProjectMemberAccessAsync(sprint.ProjectId, currentUserId);

        sprint.Status = Domain.Enums.SprintStatus.Closed; // ✅ Set explicitly
        sprint.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Sprints.Update(sprint);
        await _unitOfWork.SaveChangesAsync();

        var result = _mapper.Map<SprintDto>(sprint);
        var tasks = sprint.Tasks.ToList();
        result.TasksCount = tasks.Count;
        result.CompletedTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        result.ProgressPercentage = tasks.Count > 0
            ? Math.Round((double)result.CompletedTasksCount / tasks.Count * 100, 2)
            : 0;
        return result;
    }

    public async Task<SprintDto> StartSprintAsync(Guid id, string currentUserId)
    {
        var sprint = await _unitOfWork.Sprints.GetByIdAsync(id) ?? throw new KeyNotFoundException("Sprint not found.");
        await EnsureProjectMemberAccessAsync(sprint.ProjectId, currentUserId);

        sprint.Status = Domain.Enums.SprintStatus.Active;
        sprint.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Sprints.Update(sprint);
        await _unitOfWork.SaveChangesAsync();

        var result = _mapper.Map<SprintDto>(sprint);
        var tasks = sprint.Tasks.ToList();
        result.TasksCount = tasks.Count;
        result.CompletedTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        result.ProgressPercentage = tasks.Count > 0
            ? Math.Round((double)result.CompletedTasksCount / tasks.Count * 100, 2)
            : 0;
        return result;
    }

    public async Task DeleteSprintAsync(Guid id, string currentUserId)
    {
        var sprint = await _unitOfWork.Sprints.GetByIdAsync(id) ?? throw new KeyNotFoundException("Sprint not found.");
        await EnsureProjectMemberAccessAsync(sprint.ProjectId, currentUserId);

        sprint.IsDeleted = true;
        sprint.UpdatedAt = DateTime.UtcNow;
        _unitOfWork.Sprints.Update(sprint);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<IEnumerable<SprintDto>> GetCompletedSprintsAsync(Guid projectId)
    {
        var allSprints = await _unitOfWork.Sprints.FindAsync(s => s.ProjectId == projectId);

        var completedSprints = allSprints
            .Where(s => s.Status == Domain.Enums.SprintStatus.Closed) // ✅ Set explicitly
            .OrderByDescending(s => s.EndDate)
            .ToList();

        return completedSprints.Select(sprint =>
        {
            var dto = _mapper.Map<SprintDto>(sprint);
            var tasks = sprint.Tasks.ToList();
            dto.TasksCount = tasks.Count;
            dto.CompletedTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
            dto.ProgressPercentage = tasks.Count > 0
                ? Math.Round((double)dto.CompletedTasksCount / tasks.Count * 100, 2)
                : 0;
            return dto;
        });
    }

    private async Task EnsureProjectMemberAccessAsync(Guid projectId, string userId)
    {
        var project = await _dbContext.Projects
            .Include(p => p.Workspace)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        var isProjectMember = await _dbContext.ProjectUsers
            .AnyAsync(pu => pu.ProjectId == projectId && pu.UserId == userId);

        var canAccess = project.Workspace.OwnerId == userId || project.ProjectManagerId == userId || isProjectMember;
        if (!canAccess)
            throw new UnauthorizedAccessException("Only project members can manage sprints in this project.");
    }
}