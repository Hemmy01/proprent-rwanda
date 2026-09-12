using Microsoft.EntityFrameworkCore;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;
using PropRent.Core.Models;
using PropRent.Infrastructure.Data;

namespace PropRent.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<UserDto> GetByIdAsync(int id)
    {
        var user = await _db.Users.Include(u => u.Preferences)
            .FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new KeyNotFoundException("User not found.");

        return MapToDto(user);
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        var users = await _db.Users.Include(u => u.Preferences).OrderByDescending(u => u.CreatedAt).ToListAsync();
        return users.Select(MapToDto).ToList();
    }

    public async Task<UserDto> ToggleActiveAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");
        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(userId);
    }

    public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!string.IsNullOrWhiteSpace(request.CurrentPassword) && !string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                throw new InvalidOperationException("Current password is incorrect.");
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        }

        user.FullName = request.FullName;
        user.Phone = request.Phone;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(userId);
    }

    public async Task<UserPreferencesDto> UpsertPreferencesAsync(int userId, UserPreferencesDto request)
    {
        var prefs = await _db.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId);

        if (prefs == null)
        {
            prefs = new UserPreferences { UserId = userId };
            _db.UserPreferences.Add(prefs);
        }

        prefs.ListingType = request.ListingType;
        prefs.PropertyType = request.PropertyType;
        prefs.MaxPrice = request.MaxPrice;
        prefs.MinBedrooms = request.MinBedrooms;
        prefs.PreferredLocation = request.PreferredLocation;
        prefs.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return request;
    }

    public async Task<UserPreferencesDto?> GetPreferencesAsync(int userId)
    {
        var prefs = await _db.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (prefs == null) return null;
        return new UserPreferencesDto(prefs.ListingType, prefs.PropertyType,
            prefs.MaxPrice, prefs.MinBedrooms, prefs.PreferredLocation);
    }

    private static UserDto MapToDto(User u) => new(
        u.Id, u.FullName, u.Email, u.Phone, u.Role, u.IsActive, u.CreatedAt,
        u.Preferences == null ? null : new UserPreferencesDto(
            u.Preferences.ListingType, u.Preferences.PropertyType,
            u.Preferences.MaxPrice, u.Preferences.MinBedrooms, u.Preferences.PreferredLocation)
    );
}
