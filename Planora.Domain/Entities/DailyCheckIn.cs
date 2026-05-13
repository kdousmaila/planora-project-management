using System;

namespace Planora.Domain.Entities;

public class DailyCheckIn
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public Guid ProjectId { get; set; }
    public int EnergyLevel { get; set; }
    public int AvailableHours { get; set; }
    public bool HasBlocker { get; set; }
    public string? BlockerNote { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
    public Project? Project { get; set; }
}
