using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;
using PropRent.Core.Models;
using PropRent.Infrastructure.Data;

namespace PropRent.Infrastructure.Services;

public class PropertyService : IPropertyService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public PropertyService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<PagedResult<PropertyDto>> GetAllAsync(PropertyFilterRequest f)
    {
        var query = _db.Properties
            .Include(p => p.Images)
            .Include(p => p.Amenities)
            .Include(p => p.Agent)
            .Where(p => p.ListingStatus == "approved")
            .AsQueryable();

        if (f.AvailableOnly == true) query = query.Where(p => p.IsAvailable);

        if (!string.IsNullOrWhiteSpace(f.Query))
            query = query.Where(p => p.Title.Contains(f.Query) || p.Location.Contains(f.Query));
        if (!string.IsNullOrWhiteSpace(f.ListingType))
            query = query.Where(p => p.ListingType == f.ListingType);
        if (!string.IsNullOrWhiteSpace(f.PropertyType))
            query = query.Where(p => p.PropertyType == f.PropertyType);
        if (f.MinPrice.HasValue)
            query = query.Where(p => p.Price >= f.MinPrice.Value);
        if (f.MaxPrice.HasValue)
            query = query.Where(p => p.Price <= f.MaxPrice.Value);
        if (f.MinBedrooms.HasValue)
            query = query.Where(p => p.Bedrooms >= f.MinBedrooms.Value);

        query = query.OrderByDescending(p => p.CreatedAt);

        var total = await query.CountAsync();
        var items = await query.Skip((f.Page - 1) * f.PageSize).Take(f.PageSize).ToListAsync();

        return new PagedResult<PropertyDto>(
            items.Select(MapToDto).ToList(),
            total, f.Page, f.PageSize,
            (int)Math.Ceiling(total / (double)f.PageSize)
        );
    }

    public async Task<PropertyDto?> GetByIdAsync(int id)
    {
        var p = await _db.Properties
            .Include(p => p.Images)
            .Include(p => p.Amenities)
            .Include(p => p.Agent)
            .FirstOrDefaultAsync(p => p.Id == id);
        return p == null ? null : MapToDto(p);
    }

    public async Task<List<PropertyDto>> GetByAgentAsync(int agentUserId)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId);
        if (agent == null) return new List<PropertyDto>();

        var props = await _db.Properties
            .Include(p => p.Images).Include(p => p.Amenities).Include(p => p.Agent)
            .Where(p => p.AgentId == agent.Id)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        return props.Select(MapToDto).ToList();
    }

    public async Task<PropertyDto> CreateAsync(CreatePropertyRequest request, int? agentUserId = null)
    {
        int? agentId = request.AgentId;
        if (agentUserId.HasValue && agentId == null)
        {
            var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId.Value);
            if (agent == null || !agent.IsActive)
                throw new UnauthorizedAccessException("Your agent account is not yet approved by admin.");
            agentId = agent.Id;
        }

        var property = new Property
        {
            Title = request.Title,
            Location = request.Location,
            PropertyType = request.PropertyType,
            ListingType = request.ListingType,
            Price = request.Price,
            Bedrooms = request.Bedrooms,
            Bathrooms = request.Bathrooms,
            Parking = request.Parking,
            SizeM2 = request.SizeM2,
            Description = request.Description,
            IsFeatured = request.IsFeatured,
            AgentId = agentId,
            ListingStatus = agentUserId.HasValue ? "pending_review" : "approved"
        };

        for (int i = 0; i < request.Images.Count; i++)
            property.Images.Add(new PropertyImage { ImageUrl = request.Images[i], IsPrimary = i == 0, SortOrder = i });

        foreach (var a in request.Amenities)
            property.Amenities.Add(new PropertyAmenity { Amenity = a });

        _db.Properties.Add(property);
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(property.Id))!;
    }

    public async Task<PropertyDto> UpdateAsync(int id, UpdatePropertyRequest request, int? agentUserId = null)
    {
        var p = await _db.Properties.FindAsync(id)
            ?? throw new KeyNotFoundException("Property not found.");

        if (agentUserId.HasValue)
        {
            var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId.Value);
            if (agent == null || !agent.IsActive)
                throw new UnauthorizedAccessException("Your agent account is not yet approved by admin.");
            if (p.AgentId != agent.Id)
                throw new UnauthorizedAccessException("You can only edit your own properties.");
        }

        if (request.Title != null) p.Title = request.Title;
        if (request.Location != null) p.Location = request.Location;
        if (request.Price.HasValue) p.Price = request.Price.Value;
        if (request.IsAvailable.HasValue) p.IsAvailable = request.IsAvailable.Value;
        if (request.IsFeatured.HasValue) p.IsFeatured = request.IsFeatured.Value;
        if (request.Description != null) p.Description = request.Description;
        if (request.PropertyType != null) p.PropertyType = request.PropertyType;
        if (request.ListingType != null) p.ListingType = request.ListingType;
        if (request.Bedrooms.HasValue) p.Bedrooms = request.Bedrooms.Value;
        if (request.Bathrooms.HasValue) p.Bathrooms = request.Bathrooms.Value;
        if (request.Parking.HasValue) p.Parking = request.Parking.Value;
        if (request.SizeM2.HasValue) p.SizeM2 = request.SizeM2.Value;
        p.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id))!;
    }

    public async Task<bool> DeleteAsync(int id, int? agentUserId = null)
    {
        var p = await _db.Properties.FindAsync(id);
        if (p == null) return false;

        if (agentUserId.HasValue)
        {
            var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId.Value);
            if (agent == null || !agent.IsActive)
                throw new UnauthorizedAccessException("Your agent account is not yet approved by admin.");
            if (p.AgentId != agent.Id)
                throw new UnauthorizedAccessException("You can only delete your own properties.");
        }

        _db.Properties.Remove(p);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleAvailabilityAsync(int id, int? agentUserId = null)
    {
        var p = await _db.Properties.FindAsync(id)
            ?? throw new KeyNotFoundException("Property not found.");

        if (agentUserId.HasValue)
        {
            var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId.Value);
            if (agent == null || !agent.IsActive)
                throw new UnauthorizedAccessException("Your agent account is not yet approved by admin.");
            if (p.AgentId != agent.Id)
                throw new UnauthorizedAccessException("You can only update your own properties.");
        }

        p.IsAvailable = !p.IsAvailable;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return p.IsAvailable;
    }

    public async Task<PropertyDto> UpdateListingStatusAsync(int id, string status)
    {
        var p = await _db.Properties
            .Include(p => p.Agent)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Property not found.");

        p.ListingStatus = status;
        p.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Notify agent by email
        if (p.Agent?.UserId != null)
        {
            var agentUser = await _db.Users.FindAsync(p.Agent.UserId);
            if (agentUser?.Email != null)
            {
                var (subject, body) = status == "approved"
                    ? ($"Your listing '{p.Title}' is now live!",
                       $"Great news! Your property listing <strong>{p.Title}</strong> has been <strong style='color:#16a34a'>approved</strong> by the admin and is now visible to tenants on PropRent.")
                    : ($"Your listing '{p.Title}' was not approved",
                       $"Your property listing <strong>{p.Title}</strong> has been <strong style='color:#dc2626'>rejected</strong>. Please review the listing details and resubmit, or contact support for more information.");

                _ = AuthService.SendNotificationEmailWrapper(_config, agentUser.Email, subject, body);
            }
        }

        return (await GetByIdAsync(id))!;
    }

    public async Task<List<PropertyDto>> GetPendingReviewAsync()
    {
        var props = await _db.Properties
            .Include(p => p.Images).Include(p => p.Amenities).Include(p => p.Agent)
            .Where(p => p.ListingStatus == "pending_review")
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
        return props.Select(MapToDto).ToList();
    }

    public async Task<List<PropertyDto>> GetFeaturedAsync()
    {
        var props = await _db.Properties
            .Include(p => p.Images).Include(p => p.Amenities).Include(p => p.Agent)
            .Where(p => p.IsFeatured && p.IsAvailable && p.ListingStatus == "approved")
            .OrderByDescending(p => p.CreatedAt)
            .Take(6).ToListAsync();
        return props.Select(MapToDto).ToList();
    }

    public async Task<List<PropertyDto>> GetSimilarAsync(int propertyId, int count = 3)
    {
        var source = await _db.Properties.FindAsync(propertyId);
        if (source == null) return new List<PropertyDto>();

        var similar = await _db.Properties
            .Include(p => p.Images).Include(p => p.Amenities).Include(p => p.Agent)
            .Where(p => p.Id != propertyId && p.IsAvailable && p.ListingStatus == "approved" &&
                        (p.PropertyType == source.PropertyType || p.ListingType == source.ListingType))
            .OrderByDescending(p => p.CreatedAt)
            .Take(count).ToListAsync();

        return similar.Select(MapToDto).ToList();
    }

    private static PropertyDto MapToDto(Property p) => new(
        p.Id, p.Title, p.Location, p.PropertyType, p.ListingType,
        p.Price, p.Bedrooms, p.Bathrooms, p.Parking, p.SizeM2, p.Description,
        p.IsFeatured, p.IsAvailable, p.ListingStatus,
        p.Images.FirstOrDefault(i => i.IsPrimary)?.ImageUrl ?? p.Images.FirstOrDefault()?.ImageUrl,
        p.Images.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList(),
        p.Amenities.Select(a => a.Amenity).ToList(),
        p.Agent == null ? null : new AgentDto(p.Agent.Id, p.Agent.FullName, p.Agent.Role, p.Agent.AvatarUrl, p.Agent.Phone, p.Agent.Email),
        p.CreatedAt
    );
}
