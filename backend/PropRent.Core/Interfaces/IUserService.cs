using PropRent.Core.DTOs;

namespace PropRent.Core.Interfaces;

public interface IUserService
{
    Task<UserDto> GetByIdAsync(int id);
    Task<List<UserDto>> GetAllAsync();
    Task<UserDto> ToggleActiveAsync(int userId);
    Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task<UserPreferencesDto> UpsertPreferencesAsync(int userId, UserPreferencesDto request);
    Task<UserPreferencesDto?> GetPreferencesAsync(int userId);
}
