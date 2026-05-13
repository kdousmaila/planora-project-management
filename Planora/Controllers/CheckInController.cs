using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Planora.Application.DTOs.CheckIn;
using Planora.Application.DTOs.Common;
using Planora.Domain.Entities;
using Planora.Hubs;
using Planora.Infrastructure.Data;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Planora.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/checkin")]
[Authorize]
public class CheckInController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<ChatHub> _hub;

    public CheckInController(ApplicationDbContext context, IHubContext<ChatHub> hub)
    {
        _context = context;
        _hub = hub;
    }

    private string? GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier);

    /// <summary>Soumettre le check-in du jour</summary>
    [HttpPost]
    public async Task<IActionResult> SubmitCheckIn(
        Guid projectId, [FromBody] CreateCheckInDto dto)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var today = DateTime.UtcNow.Date;
        var existing = await _context.DailyCheckIns
            .FirstOrDefaultAsync(c =>
                c.UserId == userId &&
                c.ProjectId == projectId &&
                c.CheckedAt.Date == today);

        if (existing != null)
        {
            existing.EnergyLevel = dto.EnergyLevel;
            existing.AvailableHours = dto.AvailableHours;
            existing.HasBlocker = dto.HasBlocker;
            existing.BlockerNote = dto.BlockerNote;
            existing.CheckedAt = DateTime.UtcNow;
        }
        else
        {
            await _context.DailyCheckIns.AddAsync(new DailyCheckIn
            {
                UserId = userId,
                ProjectId = projectId,
                EnergyLevel = dto.EnergyLevel,
                AvailableHours = dto.AvailableHours,
                HasBlocker = dto.HasBlocker,
                BlockerNote = dto.BlockerNote,
                CheckedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        // ✅ Notifier uniquement admins/PMs via SignalR
        await _hub.Clients
            .Group($"managers_{projectId}")
            .SendAsync("CheckInUpdated", projectId.ToString());

        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Check-in enregistré."));
    }

    /// <summary>Est-ce que l'utilisateur a déjà fait son check-in aujourd'hui ?</summary>
    [HttpGet("today")]
    public async Task<IActionResult> GetTodayCheckIn(Guid projectId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var today = DateTime.UtcNow.Date;
        var checkIn = await _context.DailyCheckIns
            .FirstOrDefaultAsync(c =>
                c.UserId == userId &&
                c.ProjectId == projectId &&
                c.CheckedAt.Date == today);

        return Ok(ApiResponseDto<object>.SuccessResult(new
        {
            hasCheckedIn = checkIn != null,
            energyLevel = checkIn?.EnergyLevel ?? 0,
            availableHours = checkIn?.AvailableHours ?? 0,
            hasBlocker = checkIn?.HasBlocker ?? false
        }));
    }

    /// <summary>PM/Admin — voir l'énergie de toute l'équipe aujourd'hui</summary>
    [HttpGet("team")]
    public async Task<IActionResult> GetTeamEnergy(Guid projectId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var project = await _context.Projects
            .Include(p => p.Users)
            .FirstOrDefaultAsync(p => p.Id == projectId);

        if (project == null) return NotFound();

        var isAdmin = User.IsInRole("Admin");
        var isPM = project.ProjectManagerId == userId;
        if (!isAdmin && !isPM)
            return Forbid();

        var members = await _context.ProjectUsers
            .Include(pu => pu.User)
            .Where(pu => pu.ProjectId == projectId)
            .ToListAsync();

        var today = DateTime.UtcNow.Date;
        var since3Days = DateTime.UtcNow.AddDays(-3).Date;

        var checkIns = await _context.DailyCheckIns
            .Where(c => c.ProjectId == projectId && c.CheckedAt.Date == today)
            .ToListAsync();

        var recentCheckIns = await _context.DailyCheckIns
            .Where(c => c.ProjectId == projectId && c.CheckedAt.Date >= since3Days)
            .ToListAsync();

        var result = members.Select(m =>
        {
            var todayCheckIn = checkIns.FirstOrDefault(c => c.UserId == m.UserId);
            var recentForUser = recentCheckIns
                .Where(c => c.UserId == m.UserId)
                .OrderByDescending(c => c.CheckedAt)
                .ToList();

            return new TeamEnergyDto
            {
                UserId = m.UserId,
                UserName = m.User != null
                                    ? $"{m.User.FirstName} {m.User.LastName}".Trim()
                                    : "Unknown",
                EnergyLevel = todayCheckIn?.EnergyLevel ?? 0,
                AvailableHours = todayCheckIn?.AvailableHours ?? 0,
                HasBlocker = todayCheckIn?.HasBlocker ?? false,
                BlockerNote = todayCheckIn?.BlockerNote,
                HasCheckedInToday = todayCheckIn != null
            };
        }).ToList();

        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }
}