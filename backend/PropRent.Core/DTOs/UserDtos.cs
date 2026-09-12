using System.ComponentModel.DataAnnotations;

namespace PropRent.Core.DTOs;

public record UserDto(
    int Id,
    string FullName,
    string Email,
    string? Phone,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    UserPreferencesDto? Preferences
);

public record UpdateProfileRequest(
    [Required][StringLength(100, MinimumLength = 2)] string FullName,
    [Phone] string? Phone,
    string? CurrentPassword,
    [StringLength(100, MinimumLength = 6)] string? NewPassword
);

public record UserPreferencesDto(
    string? ListingType,
    string? PropertyType,
    [Range(0, double.MaxValue)] decimal? MaxPrice,
    [Range(0, 20)] int? MinBedrooms,
    [StringLength(100)] string? PreferredLocation
);
