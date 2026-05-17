// Planora.Application/Interfaces/ISprintService.cs
using Planora.Application.DTOs.Sprints;

namespace Planora.Application.Interfaces;

public interface ISprintService
{
    Task<IEnumerable<SprintDto>> GetSprintsAsync(Guid projectId);
    Task<SprintDto?> GetSprintByIdAsync(Guid id);
    Task<SprintDto> CreateSprintAsync(CreateSprintDto dto, string currentUserId);
    Task<SprintDto> UpdateSprintAsync(Guid id, UpdateSprintDto dto, string currentUserId);
    Task<SprintDto> CloseSprintAsync(Guid id, string currentUserId);
    Task<SprintDto> StartSprintAsync(Guid id, string currentUserId);
    Task DeleteSprintAsync(Guid id, string currentUserId);
    Task<IEnumerable<SprintDto>> GetCompletedSprintsAsync(Guid projectId); // ✅ Add this line
}