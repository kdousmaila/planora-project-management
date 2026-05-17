using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Planora.Application.DTOs.Common;
using Planora.Application.DTOs.Users;
using Planora.Application.Interfaces;
using Planora.Domain.Entities;

namespace Planora.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IMapper _mapper;

    public UserService(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IMapper mapper)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _mapper = mapper;
    }

    public async Task<PaginatedResultDto<UserDto>> GetUsersAsync(int page, int pageSize, string? search = null)
    {
        var query = _userManager.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search}%";
            query = query.Where(u =>
                EF.Functions.Like(u.Email!, pattern) ||
                EF.Functions.Like(u.FirstName, pattern) ||
                EF.Functions.Like(u.LastName, pattern));
        }

        var total = await query.CountAsync();
        var users = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            var dto = _mapper.Map<UserDto>(user);
            dto.Roles = await _userManager.GetRolesAsync(user);
            dtos.Add(dto);
        }

        return new PaginatedResultDto<UserDto>
        {
            Items = dtos,
            TotalCount = total,
            PageNumber = page,
            PageSize = pageSize
        };
    }

    public async Task<UserDto?> GetUserByIdAsync(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return null;

        var dto = _mapper.Map<UserDto>(user);
        dto.Roles = await _userManager.GetRolesAsync(user);
        return dto;
    }

    public async Task<UserDto> UpdateUserAsync(string id, UpdateUserDto dto)
    {
        var user = await _userManager.FindByIdAsync(id) ?? throw new KeyNotFoundException("User not found.");
        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.UserName = dto.UserName;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join(", ", result.Errors.Select(e => e.Description)));

        var userDto = _mapper.Map<UserDto>(user);
        userDto.Roles = await _userManager.GetRolesAsync(user);
        return userDto;
    }

    public async Task DeleteUserAsync(string id)
    {
        var user = await _userManager.FindByIdAsync(id) ?? throw new KeyNotFoundException("User not found.");
        await _userManager.DeleteAsync(user);
    }

    public async Task<UserDto> AssignRoleAsync(AssignRoleDto dto)
    {
        var user = await _userManager.FindByIdAsync(dto.UserId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!await _roleManager.RoleExistsAsync(dto.Role))
            throw new InvalidOperationException($"Role '{dto.Role}' does not exist.");

        // Get all current roles
        var currentRoles = await _userManager.GetRolesAsync(user);

        // Remove all current roles
        if (currentRoles.Any())
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeResult.Succeeded)
                throw new InvalidOperationException($"Failed to remove current roles: {string.Join(", ", removeResult.Errors.Select(e => e.Description))}");
        }

        // Add the new role
        var addResult = await _userManager.AddToRoleAsync(user, dto.Role);
        if (!addResult.Succeeded)
            throw new InvalidOperationException($"Failed to add role: {string.Join(", ", addResult.Errors.Select(e => e.Description))}");

        var userDto = _mapper.Map<UserDto>(user);
        userDto.Roles = await _userManager.GetRolesAsync(user);
        return userDto;
    }

    public async Task<UserDto> ActivateUserAsync(string id)
    {
        var user = await _userManager.FindByIdAsync(id) ?? throw new KeyNotFoundException("User not found.");
        user.IsActive = true;
        await _userManager.UpdateAsync(user);

        var dto = _mapper.Map<UserDto>(user);
        dto.Roles = await _userManager.GetRolesAsync(user);
        return dto;
    }

    public async Task<UserDto> DeactivateUserAsync(string id)
    {
        var user = await _userManager.FindByIdAsync(id) ?? throw new KeyNotFoundException("User not found.");
        user.IsActive = false;
        await _userManager.UpdateAsync(user);

        var dto = _mapper.Map<UserDto>(user);
        dto.Roles = await _userManager.GetRolesAsync(user);
        return dto;
    }
}