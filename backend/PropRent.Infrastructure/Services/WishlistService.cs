using Microsoft.EntityFrameworkCore;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;
using PropRent.Core.Models;
using PropRent.Infrastructure.Data;

namespace PropRent.Infrastructure.Services;

public class WishlistService : IWishlistService
{
    private readonly AppDbContext _db;

    public WishlistService(AppDbContext db) => _db = db;

    public async Task<List<PropertyDto>> GetByUserAsync(int userId)
    {
        var items = await _db.Wishlists
            .Where(w => w.UserId == userId)
            .Include(w => w.Property).ThenInclude(p => p!.Images)
            .Include(w => w.Property).ThenInclude(p => p!.Amenities)
            .Include(w => w.Property).ThenInclude(p => p!.Agent)
            .Where(w => w.Property != null)
            .Select(w => w.Property!)
            .ToListAsync();

        return items.Select(p => new PropertyDto(
            p.Id, p.Title, p.Location, p.PropertyType, p.ListingType,
            p.Price, p.Bedrooms, p.Bathrooms, p.Parking, p.SizeM2, p.Description,
            p.IsFeatured, p.IsAvailable, p.ListingStatus,
            p.Images.FirstOrDefault(i => i.IsPrimary)?.ImageUrl,
            p.Images.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList(),
            p.Amenities.Select(a => a.Amenity).ToList(),
            p.Agent == null ? null : new AgentDto(p.Agent.Id, p.Agent.FullName, p.Agent.Role, p.Agent.AvatarUrl, p.Agent.Phone, p.Agent.Email),
            p.CreatedAt
        )).ToList();
    }

    public async Task<bool> ToggleAsync(int userId, int propertyId)
    {
        var existing = await _db.Wishlists
            .FirstOrDefaultAsync(w => w.UserId == userId && w.PropertyId == propertyId);

        if (existing != null)
        {
            _db.Wishlists.Remove(existing);
            await _db.SaveChangesAsync();
            return false; // removed
        }

        _db.Wishlists.Add(new Wishlist { UserId = userId, PropertyId = propertyId });
        await _db.SaveChangesAsync();
        return true; // added
    }

    public async Task<bool> IsInWishlistAsync(int userId, int propertyId) =>
        await _db.Wishlists.AnyAsync(w => w.UserId == userId && w.PropertyId == propertyId);
}
