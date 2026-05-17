using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Planora.Application.DTOs.Workspaces;
using Planora.Application.Interfaces;
using Planora.Domain.Entities;
using Planora.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Planora.Infrastructure.Services;

public class WorkspaceService : IWorkspaceService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IMapper _mapper;
    private readonly IEmailService _emailService;
    private readonly ILogger<WorkspaceService> _logger;

    public WorkspaceService(ApplicationDbContext dbContext, UserManager<ApplicationUser> userManager, IMapper mapper, IEmailService emailService, ILogger<WorkspaceService> logger)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _mapper = mapper;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<IEnumerable<WorkspaceDto>> GetAccessibleWorkspacesAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        var userRoles = await _userManager.GetRolesAsync(user);

        IQueryable<Workspace> query = WorkspaceQuery();

        if (userRoles.Contains("Admin"))
        {
            query = query.Where(w => w.OwnerId == userId);
        }
        else if (userRoles.Contains("ProjectManager"))
        {
            query = query.Where(w =>
                w.OwnerId == userId ||
                w.ProjectManagerId == userId ||
                w.Members.Any(m => m.UserId == userId)
            );
        }
        else
        {
            query = query.Where(w =>
                w.Projects.Any(p => !p.IsDeleted && p.Users.Any(u => !u.IsDeleted && u.UserId == userId)) ||
                w.Members.Any(m => m.UserId == userId)
            );
        }

        var workspaces = await query.OrderByDescending(w => w.CreatedAt).ToListAsync();
        return workspaces.Select(_mapper.Map<WorkspaceDto>).ToList();
    }

    public async Task<WorkspaceDto?> GetWorkspaceByIdAsync(Guid workspaceId, string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        var userRoles = await _userManager.GetRolesAsync(user);

        var workspace = await WorkspaceQuery()
            .FirstOrDefaultAsync(w => w.Id == workspaceId);

        if (workspace == null) return null;

        bool hasAccess = userRoles.Contains("Admin")
            ? workspace.OwnerId == userId
            : userRoles.Contains("ProjectManager")
                ? workspace.OwnerId == userId || workspace.ProjectManagerId == userId || workspace.Members.Any(m => m.UserId == userId)
                : workspace.Projects.Any(p => !p.IsDeleted && p.Users.Any(u => !u.IsDeleted && u.UserId == userId))
                  || workspace.Members.Any(m => m.UserId == userId);

        if (!hasAccess) return null;

        var hasPendingPM = await _dbContext.WorkspaceInvitations
            .AnyAsync(i => i.WorkspaceId == workspaceId
                && i.Role == "ProjectManager"
                && !i.Accepted
                && i.ExpiresAt > DateTime.UtcNow);

        var dto = _mapper.Map<WorkspaceDto>(workspace);
        dto.HasPendingPMInvitation = hasPendingPM;
        return dto;
    }

    public async Task<WorkspaceDto> CreateWorkspaceAsync(CreateWorkspaceDto dto, string ownerUserId)
    {
        var owner = await _userManager.FindByIdAsync(ownerUserId)
            ?? throw new KeyNotFoundException("Owner user not found.");

        var userRoles = await _userManager.GetRolesAsync(owner);
        if (!userRoles.Contains("Admin"))
            throw new UnauthorizedAccessException("Only Admins can create workspaces.");

        var workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow
        };

        var ownerMembership = new WorkspaceUser
        {
            WorkspaceId = workspace.Id,
            UserId = owner.Id,
            JoinedAt = DateTime.UtcNow
        };

        await _dbContext.Workspaces.AddAsync(workspace);
        await _dbContext.WorkspaceUsers.AddAsync(ownerMembership);
        await _dbContext.SaveChangesAsync();

        workspace.Owner = owner;
        workspace.Members = new List<WorkspaceUser> { ownerMembership };
        return _mapper.Map<WorkspaceDto>(workspace);
    }

    public async Task<IEnumerable<WorkspaceInviteableUserDto>> GetInviteableUsersAsync(Guid workspaceId, string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        var userRoles = await _userManager.GetRolesAsync(user);

        bool canInvite = userRoles.Contains("Admin") &&
            await _dbContext.Workspaces.AnyAsync(w => w.Id == workspaceId && w.OwnerId == userId);

        if (!canInvite)
            throw new UnauthorizedAccessException("Only workspace owner can invite users.");

        var memberIds = await _dbContext.WorkspaceUsers
            .Where(wu => wu.WorkspaceId == workspaceId)
            .Select(wu => wu.UserId)
            .ToListAsync();

        var pendingInvitationEmails = await _dbContext.WorkspaceInvitations
            .Where(i => i.WorkspaceId == workspaceId && !i.Accepted && i.ExpiresAt > DateTime.UtcNow)
            .Select(i => i.Email)
            .ToListAsync();

        var allUsers = await _userManager.Users
            .Where(u => u.IsActive && u.Id != userId && u.Email != null)
            .Where(u => !memberIds.Contains(u.Id))
            .Where(u => !pendingInvitationEmails.Contains(u.Email!))
            .ToListAsync();

        var inviteableUsers = new List<WorkspaceInviteableUserDto>();
        foreach (var u in allUsers)
        {
            var roles = await _userManager.GetRolesAsync(u);
            inviteableUsers.Add(new WorkspaceInviteableUserDto
            {
                UserId = u.Id,
                FullName = $"{u.FirstName} {u.LastName}",
                Email = u.Email ?? string.Empty,
                Roles = roles.ToList()
            });
        }

        return inviteableUsers;
    }

    public async Task<WorkspaceInvitationDto> InviteUserAsync(Guid workspaceId, InviteWorkspaceUserDto dto, string inviterUserId)
    {
        var inviter = await _userManager.FindByIdAsync(inviterUserId)
            ?? throw new KeyNotFoundException("Inviter not found.");
        var userRoles = await _userManager.GetRolesAsync(inviter);

        bool canInvite = userRoles.Contains("Admin") &&
            await _dbContext.Workspaces.AnyAsync(w => w.Id == workspaceId && w.OwnerId == inviterUserId);

        if (!canInvite)
            throw new UnauthorizedAccessException("Only workspace owner can invite users.");

        var workspace = await _dbContext.Workspaces.FirstOrDefaultAsync(w => w.Id == workspaceId)
            ?? throw new KeyNotFoundException("Workspace not found.");

        var targetUser = await _userManager.FindByIdAsync(dto.UserId)
            ?? throw new KeyNotFoundException("User not found.");

        if (dto.Role == "ProjectManager")
        {
            if (workspace.ProjectManagerId != null)
                throw new InvalidOperationException("This workspace already has a Project Manager. Only one Project Manager is allowed per workspace.");

            var pendingPMInvitation = await _dbContext.WorkspaceInvitations
                .AnyAsync(i => i.WorkspaceId == workspaceId
                    && i.Role == "ProjectManager"
                    && !i.Accepted
                    && i.ExpiresAt > DateTime.UtcNow);

            if (pendingPMInvitation)
                throw new InvalidOperationException("A Project Manager invitation is already pending for this workspace.");

            var acceptedPMInvitation = await _dbContext.WorkspaceInvitations
                .AnyAsync(i => i.WorkspaceId == workspaceId
                    && i.Role == "ProjectManager"
                    && i.Accepted);

            if (acceptedPMInvitation)
                throw new InvalidOperationException("This workspace already has a Project Manager invitation that was accepted.");
        }

        if (string.IsNullOrWhiteSpace(targetUser.Email))
            throw new InvalidOperationException("The selected user does not have an email address.");

        var email = targetUser.Email.Trim().ToLowerInvariant();

        var alreadyMember = await _dbContext.WorkspaceUsers
            .AnyAsync(wu => wu.WorkspaceId == workspaceId && wu.User.Email != null && wu.User.Email.ToLower() == email);
        if (alreadyMember)
            throw new InvalidOperationException("User is already a workspace member.");

        var hasPendingInvitation = await _dbContext.WorkspaceInvitations
            .AnyAsync(i => i.WorkspaceId == workspaceId && i.Email.ToLower() == email && !i.Accepted && i.ExpiresAt > DateTime.UtcNow);
        if (hasPendingInvitation)
            throw new InvalidOperationException("A pending invitation already exists for this email.");

        var invitation = new WorkspaceInvitation
        {
            WorkspaceId = workspaceId,
            Email = email,
            InvitedByUserId = inviterUserId,
            Token = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            Accepted = false,
            CreatedAt = DateTime.UtcNow,
            Role = dto.Role
        };

        await _dbContext.WorkspaceInvitations.AddAsync(invitation);
        await _dbContext.SaveChangesAsync();

        var inviterFullName = $"{inviter.FirstName} {inviter.LastName}";
        try
        {
            await _emailService.SendWorkspaceInvitationAsync(email, inviterFullName, workspace.Name, dto.Role);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send workspace invitation email for invitation {InvitationId}. Invitation was saved successfully.", invitation.Id);
        }

        invitation.Workspace = workspace;
        return _mapper.Map<WorkspaceInvitationDto>(invitation);
    }

    public async Task<IEnumerable<WorkspaceInvitationDto>> GetPendingInvitationsAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        if (string.IsNullOrWhiteSpace(user.Email))
            return new List<WorkspaceInvitationDto>();

        var email = user.Email.ToLowerInvariant();
        var invitations = await _dbContext.WorkspaceInvitations
            .Include(i => i.Workspace)
            .Where(i => !i.Accepted && i.ExpiresAt > DateTime.UtcNow && i.Email.ToLower() == email)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return invitations.Select(_mapper.Map<WorkspaceInvitationDto>).ToList();
    }

    public async Task AcceptInvitationAsync(Guid invitationId, string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (string.IsNullOrWhiteSpace(user.Email))
            throw new InvalidOperationException("User email is required to accept invitations.");

        var invitation = await _dbContext.WorkspaceInvitations
            .FirstOrDefaultAsync(i => i.Id == invitationId)
            ?? throw new KeyNotFoundException("Invitation not found.");

        if (invitation.Accepted)
            throw new InvalidOperationException("Invitation has already been accepted.");

        if (invitation.ExpiresAt <= DateTime.UtcNow)
            throw new InvalidOperationException("Invitation has expired.");

        if (!string.Equals(invitation.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("This invitation does not belong to the current user.");

        var alreadyMember = await _dbContext.WorkspaceUsers
            .AnyAsync(wu => wu.WorkspaceId == invitation.WorkspaceId && wu.UserId == userId);

        if (!alreadyMember)
        {
            await _dbContext.WorkspaceUsers.AddAsync(new WorkspaceUser
            {
                WorkspaceId = invitation.WorkspaceId,  // Guid non nullable, pas besoin de .Value
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            });
        }

        if (invitation.Role == "ProjectManager")
        {
            var workspace = await _dbContext.Workspaces
                .FirstOrDefaultAsync(w => w.Id == invitation.WorkspaceId);  // FirstOrDefaultAsync au lieu de FindAsync

            if (workspace != null)
            {
                if (workspace.ProjectManagerId != null && workspace.ProjectManagerId != userId)
                    throw new InvalidOperationException("This workspace already has a Project Manager.");

                workspace.ProjectManagerId = userId;
                _dbContext.Workspaces.Update(workspace);
            }
        }

        invitation.Accepted = true;
        invitation.RespondedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
    }

    public async Task RejectInvitationAsync(Guid invitationId, string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        if (string.IsNullOrWhiteSpace(user.Email))
            throw new InvalidOperationException("User email is required to reject invitations.");

        var invitation = await _dbContext.WorkspaceInvitations
            .FirstOrDefaultAsync(i => i.Id == invitationId)
            ?? throw new KeyNotFoundException("Invitation not found.");

        if (!string.Equals(invitation.Email, user.Email, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("This invitation does not belong to the current user.");

        invitation.RespondedAt = DateTime.UtcNow;
        invitation.ExpiresAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
    }

    public async Task<IEnumerable<WorkspaceMemberDto>> GetMembersAsync(Guid workspaceId, string userId)
    {
        var user = await _userManager.FindByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        var userRoles = await _userManager.GetRolesAsync(user);

        bool canAccess = userRoles.Contains("Admin")
            ? await _dbContext.Workspaces.AnyAsync(w => w.Id == workspaceId && w.OwnerId == userId)
            : userRoles.Contains("ProjectManager")
                ? await _dbContext.Workspaces.AnyAsync(w => w.Id == workspaceId && (w.OwnerId == userId || w.ProjectManagerId == userId || w.Members.Any(m => m.UserId == userId)))
                : await _dbContext.Workspaces.AnyAsync(w => w.Id == workspaceId && w.Members.Any(m => m.UserId == userId));

        if (!canAccess)
            throw new UnauthorizedAccessException("Access denied to this workspace.");

        var members = await _dbContext.WorkspaceUsers
            .Include(wu => wu.User)
            .Where(wu => wu.WorkspaceId == workspaceId)
            .OrderBy(wu => wu.JoinedAt)
            .ToListAsync();

        // Use FirstOrDefaultAsync instead of FindAsync to avoid the Guid? issue
        var workspace = await _dbContext.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId);

        var workspaceMembers = new List<WorkspaceMemberDto>();

        foreach (var member in members)
        {
            var memberRoles = await _userManager.GetRolesAsync(member.User);
            var role = memberRoles.Contains("Admin") ? "Admin" :
                      (workspace != null && workspace.ProjectManagerId == member.UserId) ? "ProjectManager" : "Member";

            workspaceMembers.Add(new WorkspaceMemberDto
            {
                UserId = member.UserId,
                FullName = $"{member.User.FirstName} {member.User.LastName}",
                Email = member.User.Email ?? string.Empty,
                JoinedAt = member.JoinedAt,
                Role = role
            });
        }

        return workspaceMembers;
    }

    public async Task RemoveMemberAsync(Guid workspaceId, string userIdToRemove, string ownerUserId)
    {
        var workspace = await _dbContext.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId && w.OwnerId == ownerUserId)
            ?? throw new KeyNotFoundException("Workspace not found or access denied.");

        if (workspace.OwnerId == userIdToRemove)
            throw new InvalidOperationException("Workspace owner cannot be removed.");

        if (workspace.ProjectManagerId == userIdToRemove)
        {
            workspace.ProjectManagerId = null;
            _dbContext.Workspaces.Update(workspace);
        }

        var member = await _dbContext.WorkspaceUsers
            .FirstOrDefaultAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == userIdToRemove)
            ?? throw new KeyNotFoundException("Workspace member not found.");

        _dbContext.WorkspaceUsers.Remove(member);

        var projectAssignments = await _dbContext.ProjectUsers
            .Where(pu => pu.UserId == userIdToRemove && pu.Project.WorkspaceId == workspaceId)
            .ToListAsync();
        _dbContext.ProjectUsers.RemoveRange(projectAssignments);

        await _dbContext.SaveChangesAsync();
    }

    public async Task<WorkspaceDto> SetProjectManagerAsync(Guid workspaceId, SetWorkspaceProjectManagerDto dto, string ownerUserId)
    {
        var workspace = await _dbContext.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId && w.OwnerId == ownerUserId)
            ?? throw new KeyNotFoundException("Workspace not found or access denied.");

        var user = await _userManager.FindByIdAsync(dto.UserId)
            ?? throw new KeyNotFoundException("User not found.");

        var isMember = await _dbContext.WorkspaceUsers
            .AnyAsync(wu => wu.WorkspaceId == workspaceId && wu.UserId == dto.UserId);

        if (!isMember)
            throw new InvalidOperationException("User must be a member of the workspace to become Project Manager.");

        workspace.ProjectManagerId = dto.UserId;
        _dbContext.Workspaces.Update(workspace);
        await _dbContext.SaveChangesAsync();

        return _mapper.Map<WorkspaceDto>(workspace);
    }

    private IQueryable<Workspace> WorkspaceQuery()
        => _dbContext.Workspaces
            .Include(w => w.Owner)
            .Include(w => w.Members)
            .Include(w => w.Projects)
                .ThenInclude(p => p.Users);

    public async Task DeleteWorkspaceAsync(Guid workspaceId, string userId)
    {
        var workspace = await _dbContext.Workspaces
            .FirstOrDefaultAsync(w => w.Id == workspaceId && w.OwnerId == userId)
            ?? throw new KeyNotFoundException("Workspace not found or access denied.");

        var projectIds = await _dbContext.Projects
            .IgnoreQueryFilters()  // ← inclure les soft-deleted
            .Where(p => p.WorkspaceId == workspaceId)
            .Select(p => p.Id)
            .ToListAsync();

        if (projectIds.Any())
        {
            var backlogItemIds = await _dbContext.BacklogItems
                .IgnoreQueryFilters()
                .Where(b => projectIds.Contains(b.ProjectId))
                .Select(b => b.Id)
                .ToListAsync();

            if (backlogItemIds.Any())
            {
                var commits = _dbContext.BacklogCommits
                    .IgnoreQueryFilters()
                    .Where(c => backlogItemIds.Contains(c.BacklogItemId));
                _dbContext.BacklogCommits.RemoveRange(commits);

                var branches = _dbContext.BacklogBranches
                    .IgnoreQueryFilters()
                    .Where(b => backlogItemIds.Contains(b.BacklogItemId));
                _dbContext.BacklogBranches.RemoveRange(branches);

                var links = _dbContext.BacklogLinks
                    .IgnoreQueryFilters()
                    .Where(l => backlogItemIds.Contains(l.SourceItemId)
                             || backlogItemIds.Contains(l.TargetItemId));
                _dbContext.BacklogLinks.RemoveRange(links);

                var attachments = _dbContext.BacklogAttachments
                    .IgnoreQueryFilters()
                    .Where(a => backlogItemIds.Contains(a.BacklogItemId));
                _dbContext.BacklogAttachments.RemoveRange(attachments);

                var webLinks = _dbContext.BacklogWebLinks
                    .IgnoreQueryFilters()
                    .Where(w => backlogItemIds.Contains(w.BacklogItemId));
                _dbContext.BacklogWebLinks.RemoveRange(webLinks);

                var comments = _dbContext.Comments
                    .IgnoreQueryFilters()
                    .Where(c => c.BacklogItemId.HasValue
                             && backlogItemIds.Contains(c.BacklogItemId.Value));
                _dbContext.Comments.RemoveRange(comments);

                var subTasks = _dbContext.SubTasks
                    .IgnoreQueryFilters()
                    .Where(s => backlogItemIds.Contains(s.BacklogItemId));
                _dbContext.SubTasks.RemoveRange(subTasks);

                var backlogItems = _dbContext.BacklogItems
                    .IgnoreQueryFilters()
                    .Where(b => backlogItemIds.Contains(b.Id));
                _dbContext.BacklogItems.RemoveRange(backlogItems);
            }

            var projectInvitations = _dbContext.ProjectInvitations
                .IgnoreQueryFilters()
                .Where(pi => projectIds.Contains(pi.ProjectId));
            _dbContext.ProjectInvitations.RemoveRange(projectInvitations);

            var taskIds = await _dbContext.Tasks
                .IgnoreQueryFilters()
                .Where(t => projectIds.Contains(t.ProjectId))
                .Select(t => t.Id)
                .ToListAsync();

            if (taskIds.Any())
            {
                var taskComments = _dbContext.Comments
                    .IgnoreQueryFilters()
                    .Where(c => c.TaskId.HasValue && taskIds.Contains(c.TaskId.Value));
                _dbContext.Comments.RemoveRange(taskComments);

                var tasks = _dbContext.Tasks
                    .IgnoreQueryFilters()
                    .Where(t => taskIds.Contains(t.Id));
                _dbContext.Tasks.RemoveRange(tasks);
            }

            var sprints = _dbContext.Sprints
                .IgnoreQueryFilters()
                .Where(s => projectIds.Contains(s.ProjectId));
            _dbContext.Sprints.RemoveRange(sprints);

            var projectUsers = _dbContext.ProjectUsers
                .Where(pu => projectIds.Contains(pu.ProjectId));
            _dbContext.ProjectUsers.RemoveRange(projectUsers);

            var projects = _dbContext.Projects
                .IgnoreQueryFilters()
                .Where(p => projectIds.Contains(p.Id));
            _dbContext.Projects.RemoveRange(projects);
        }

        var members = _dbContext.WorkspaceUsers
            .Where(wu => wu.WorkspaceId == workspaceId);
        _dbContext.WorkspaceUsers.RemoveRange(members);

        var invitations = _dbContext.WorkspaceInvitations
            .Where(i => i.WorkspaceId == workspaceId);
        _dbContext.WorkspaceInvitations.RemoveRange(invitations);

        _dbContext.Workspaces.Remove(workspace);
        await _dbContext.SaveChangesAsync();
    }
}