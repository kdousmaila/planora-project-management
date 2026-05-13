using System;

namespace Planora.Application.DTOs.CheckIn;

public class CreateCheckInDto
{
    public Guid ProjectId { get; set; }
    public int EnergyLevel { get; set; }
    public int AvailableHours { get; set; }
    public bool HasBlocker { get; set; }
    public string? BlockerNote { get; set; }
}

public class CheckInDto
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public Guid ProjectId { get; set; }
    public int EnergyLevel { get; set; }
    public int AvailableHours { get; set; }
    public bool HasBlocker { get; set; }
    public string? BlockerNote { get; set; }
    public DateTime CheckedAt { get; set; }
}

public class TeamEnergyDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public int EnergyLevel { get; set; }
    public int AvailableHours { get; set; }
    public bool HasBlocker { get; set; }
    public string? BlockerNote { get; set; }
    public bool HasCheckedInToday { get; set; }
    public string? DominantMood { get; set; }
    public double StressRatio { get; set; }

    public string EnergyStatus =>
        EnergyLevel >= 4 ? "high" :
        EnergyLevel >= 3 ? "medium" : "low";
}