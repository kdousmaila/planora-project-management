using Microsoft.EntityFrameworkCore;
using Planora.Application.DTOs.Dashboard;
using Planora.Application.Interfaces;
using Planora.Domain.Enums;
using Planora.Infrastructure.Data;
using System;
using System.Threading.Tasks;

namespace Planora.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _dbContext;

    public DashboardService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DashboardDto> GetDashboardAsync(string? userId = null)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return new DashboardDto();
        }

        var visibleProjectIds = await _dbContext.Projects
            .Where(p => !p.IsDeleted)
            .Where(p => p.Workspace.OwnerId == userId
                     || p.ProjectManagerId == userId
                     || p.Users.Any(u => u.UserId == userId))
            .Select(p => p.Id)
            .ToListAsync();

        var projects = await _dbContext.Projects
            .Include(p => p.Workspace)
            .Where(p => !p.IsDeleted)
            .Where(p => visibleProjectIds.Contains(p.Id))
            .ToListAsync();

        var backlogItems = await _dbContext.BacklogItems
            .Where(b => !b.IsDeleted)
            .Where(b => visibleProjectIds.Contains(b.ProjectId))
            .ToListAsync();

        var sprints = await _dbContext.Sprints
            .Where(s => !s.IsDeleted)
            .Where(s => visibleProjectIds.Contains(s.ProjectId))
            .ToListAsync();

        var workspaceIds = await _dbContext.Workspaces
            .Where(w => !w.IsDeleted)
            .Where(w =>
                w.OwnerId == userId ||
                w.Projects.Any(p => !p.IsDeleted &&
                    (p.ProjectManagerId == userId || p.Users.Any(u => u.UserId == userId)))
            )
            .Select(w => w.Id)
            .ToListAsync();

        var workspaces = await _dbContext.Workspaces
            .Where(w => workspaceIds.Contains(w.Id))
            .Include(w => w.Projects)
            .ToListAsync();

        var dto = new DashboardDto
        {
            TotalProjects = projects.Count,
            ActiveSprints = sprints.Count(s => s.Status == SprintStatus.Active),
            TotalTasks = backlogItems.Count,
            CompletedTasks = backlogItems.Count(b => b.Status == (int)Domain.Enums.TaskStatus.Done),
            InProgressTasks = backlogItems.Count(b => b.Status == (int)Domain.Enums.TaskStatus.InProgress),
            ToDoTasks = backlogItems.Count(b => b.Status == (int)Domain.Enums.TaskStatus.ToDo),
            OverallProgressPercentage = backlogItems.Count > 0
                ? Math.Round((double)backlogItems.Count(b => b.Status == (int)Domain.Enums.TaskStatus.Done)
                    / backlogItems.Count * 100, 2)
                : 0,
            ProjectsProgress = projects.Select(p =>
            {
                var projectTasks = backlogItems.Where(b => b.ProjectId == p.Id).ToList();
                return new ProjectProgressDto
                {
                    ProjectId = p.Id,
                    ProjectName = p.Name,
                    WorkspaceName = p.Workspace.Name,
                    TotalTasks = projectTasks.Count,
                    CompletedTasks = projectTasks.Count(t => t.Status == (int)Domain.Enums.TaskStatus.Done),
                    ProgressPercentage = projectTasks.Count > 0
                        ? Math.Round((double)projectTasks.Count(t => t.Status == (int)Domain.Enums.TaskStatus.Done)
                            / projectTasks.Count * 100, 2)
                        : 0
                };
            }).ToList(),
            TotalWorkspaces = workspaces.Count,
            WorkspacesProgress = workspaces.Select(w =>
            {
                var workspaceProjectIds = w.Projects.Where(p => !p.IsDeleted).Select(p => p.Id).ToList();
                var workspaceTasks = backlogItems.Where(b => workspaceProjectIds.Contains(b.ProjectId)).ToList();
                return new WorkspaceProgressDto
                {
                    WorkspaceId = w.Id,
                    WorkspaceName = w.Name,
                    TotalProjects = workspaceProjectIds.Count,
                    TotalTasks = workspaceTasks.Count,
                    CompletedTasks = workspaceTasks.Count(t => t.Status == (int)Domain.Enums.TaskStatus.Done),
                    ProgressPercentage = workspaceTasks.Count > 0
                        ? Math.Round((double)workspaceTasks.Count(t => t.Status == (int)Domain.Enums.TaskStatus.Done)
                            / workspaceTasks.Count * 100, 2)
                        : 0
                };
            }).ToList()
        };

        return dto;
    }
}