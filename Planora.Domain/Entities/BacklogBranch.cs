using System;

namespace Planora.Domain.Entities;

public class BacklogBranch
{
    public Guid Id { get; set; }
    public Guid BacklogItemId { get; set; }
    public BacklogItem BacklogItem { get; set; } = null!;
    public string BranchName { get; set; } = string.Empty;
    public string CreatedById { get; set; } = string.Empty;
    public ApplicationUser? CreatedBy { get; set; }
    public List<BacklogCommit> Commits { get; set; } = new(); 
    public DateTime CreatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
}