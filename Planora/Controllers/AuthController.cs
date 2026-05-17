using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Planora.Application.DTOs.Auth;
using Planora.Application.DTOs.Common;
using Planora.Application.Interfaces;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Planora.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        // ✅ Validate DataAnnotations ([EmailAddress], [Required], etc.)
        if (!ModelState.IsValid)
        {
            var firstError = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .FirstOrDefault() ?? "Invalid data.";

            return BadRequest(ApiResponseDto<object>.ErrorResult(firstError));
        }

        try
        {
            var result = await _authService.RegisterAsync(dto);
            return Ok(ApiResponseDto<AuthResponseDto>.SuccessResult(result, "Registration successful."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponseDto<object>.ErrorResult(ex.Message));
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var result = await _authService.LoginAsync(dto);
            return Ok(ApiResponseDto<AuthResponseDto>.SuccessResult(result, "Login successful."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponseDto<object>.ErrorResult(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponseDto<object>.ErrorResult(ex.Message));
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(dto);
            return Ok(ApiResponseDto<AuthResponseDto>.SuccessResult(result, "Token refreshed successfully."));
        }
        catch (Exception ex)
        {
            return Unauthorized(ApiResponseDto<object>.ErrorResult(ex.Message));
        }
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(ApiResponseDto<object>.ErrorResult("User not authenticated."));
        await _authService.LogoutAsync(userId);
        return Ok(ApiResponseDto<object>.SuccessResult(null!, "Logged out successfully."));
    }
}