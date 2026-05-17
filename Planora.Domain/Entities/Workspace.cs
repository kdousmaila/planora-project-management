// Domain/Entities/Workspace.cs
using System;
using System.Collections.Generic;

namespace Planora.Domain.Entities;

public class Workspace
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string? ProjectManagerId { get; set; } // ← ADD THIS PROPERTY
    public DateTime CreatedAt { get; set; }
    public bool IsDeleted { get; set; }

    // Navigation properties
    public ApplicationUser? Owner { get; set; }
    public ApplicationUser? ProjectManager { get; set; } // ← ADD THIS PROPERTY
    public ICollection<WorkspaceUser> Members { get; set; } = new List<WorkspaceUser>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<WorkspaceInvitation> Invitations { get; set; } = new List<WorkspaceInvitation>();
}