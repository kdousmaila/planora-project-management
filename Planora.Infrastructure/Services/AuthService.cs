using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Planora.Application.DTOs.Auth;
using Planora.Application.Interfaces;
using Planora.Domain.Entities;
using System;
using System.Threading.Tasks;

namespace Planora.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private readonly IEmailService _emailService;

    public AuthService(UserManager<ApplicationUser> userManager, IJwtService jwtService, IConfiguration configuration, ILogger<AuthService> logger, IEmailService emailService)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _configuration = configuration;
        _logger = logger;
        _emailService = emailService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
            throw new InvalidOperationException("A user with this email already exists.");

        var user = new ApplicationUser
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            UserName = dto.UserName,
            IsActive = true
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));

        await _userManager.AddToRoleAsync(user, "Member");

        try
        {
            await _emailService.SendWelcomeEmailAsync(user.Email ?? dto.Email, $"{dto.FirstName} {dto.LastName}");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send welcome email for user {UserId}. Registration will proceed.", user.Id);
        }

        return await IssueTokensAsync(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);

        // ✅ Fix 1: clean null check
        if (user == null || !user.IsActive)
            throw new UnauthorizedAccessException("Invalid credentials or account is inactive.");

        var isValid = await _userManager.CheckPasswordAsync(user, dto.Password);

        // ✅ Fix 2: typo fixed (removed stray text before throw)
        if (!isValid)
            throw new UnauthorizedAccessException("Invalid credentials.");

        return await IssueTokensAsync(user);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto dto)
    {
        var principal = _jwtService.GetPrincipalFromExpiredToken(dto.Token);
        if (principal == null)
            throw new UnauthorizedAccessException("Invalid token.");

        // ✅ Fix 3: userId cannot be null here
        var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? string.Empty;

        var user = await _userManager.FindByIdAsync(userId);

        if (user == null || user.RefreshToken != dto.RefreshToken || user.RefreshTokenExpiry <= DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        return await IssueTokensAsync(user);
    }

    public async Task LogoutAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            await _userManager.UpdateAsync(user);
        }
    }

    private async Task<AuthResponseDto> IssueTokensAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var token = _jwtService.GenerateToken(user, roles);
        var refreshToken = _jwtService.GenerateRefreshToken();

        var rawValue = _configuration["JwtSettings:ExpiryMinutes"];
        if (!int.TryParse(rawValue, out var expiryMinutes))
        {
            _logger.LogWarning("JwtSettings:ExpiryMinutes is missing or invalid ('{Value}'). Defaulting to 60 minutes.", rawValue);
            expiryMinutes = 60;
        }

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _userManager.UpdateAsync(user);

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            Expiry = DateTime.UtcNow.AddMinutes(expiryMinutes),
            UserId = user.Id,
            // ✅ Fix 4: Email can never be null in AuthResponseDto
            Email = user.Email ?? string.Empty,
            FullName = $"{user.FirstName} {user.LastName}",
            Roles = roles
        };
    }
}