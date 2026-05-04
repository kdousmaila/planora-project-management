using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Planora.Application.DTOs.Common;
using Planora.Application.DTOs.Meeting;
using Planora.Application.Interfaces;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Planora.Controllers;

[ApiController]
[Route("api/projects/{projectId:guid}/meetings")]
[Authorize]
public class MeetingController : ControllerBase
{
    private readonly IMeetingService _meetingService;
    public MeetingController(IMeetingService meetingService) => _meetingService = meetingService;

    [HttpPost("pin")]
    public async Task<IActionResult> PinMessage(Guid projectId, [FromBody] PinMessageDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await _meetingService.PinMessageAsync(projectId, dto, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }

    [HttpDelete("pin/{pinnedMessageId:guid}")]
    public async Task<IActionResult> UnpinMessage(Guid projectId, Guid pinnedMessageId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        await _meetingService.UnpinMessageAsync(projectId, pinnedMessageId, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(null));
    }

    [HttpGet("pinned")]
    public async Task<IActionResult> GetPinned(Guid projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await _meetingService.GetPinnedMessagesAsync(projectId, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }

    [HttpPost]
    public async Task<IActionResult> CreateMeeting(Guid projectId, [FromBody] CreateMeetingDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await _meetingService.CreateMeetingAsync(projectId, dto, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }

    [HttpGet]
    public async Task<IActionResult> GetMeetings(Guid projectId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var result = await _meetingService.GetMeetingsAsync(projectId, userId);
        return Ok(ApiResponseDto<object>.SuccessResult(result));
    }
}
