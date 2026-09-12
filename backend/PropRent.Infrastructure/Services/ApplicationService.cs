using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;
using PropRent.Core.Models;
using PropRent.Infrastructure.Data;

namespace PropRent.Infrastructure.Services;

public class ApplicationService : IApplicationService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public ApplicationService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<List<ApplicationDto>> GetByTenantAsync(int tenantId)
    {
        var apps = await _db.Applications
            .Include(a => a.Property).ThenInclude(p => p!.Images)
            .Include(a => a.Tenant)
            .Where(a => a.TenantId == tenantId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
        return apps.Select(MapToDto).ToList();
    }

    public async Task<List<ApplicationDto>> GetAllAsync()
    {
        var apps = await _db.Applications
            .Include(a => a.Property).ThenInclude(p => p!.Images)
            .Include(a => a.Tenant)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
        return apps.Select(MapToDto).ToList();
    }

    public async Task<ApplicationDto> CreateAsync(int tenantId, CreateApplicationRequest request)
    {
        var exists = await _db.Applications.AnyAsync(a =>
            a.PropertyId == request.PropertyId && a.TenantId == tenantId);
        if (exists) throw new InvalidOperationException("You have already applied for this property.");

        var property = await _db.Properties.FindAsync(request.PropertyId)
            ?? throw new KeyNotFoundException("Property not found.");
        if (!property.IsAvailable) throw new InvalidOperationException("Property is not available.");

        var app = new Application
        {
            PropertyId = request.PropertyId,
            TenantId = tenantId,
            Message = request.Message,
            ViewingDate = request.ViewingDate
        };

        _db.Applications.Add(app);
        await _db.SaveChangesAsync();

        return (await GetByTenantAsync(tenantId)).First(a => a.Id == app.Id);
    }

    public async Task<List<ApplicationDto>> GetByAgentAsync(int agentUserId)
    {
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId);
        if (agent == null) return new List<ApplicationDto>();

        var apps = await _db.Applications
            .Include(a => a.Property).ThenInclude(p => p!.Images)
            .Include(a => a.Tenant)
            .Where(a => a.Property != null && a.Property.AgentId == agent.Id)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
        return apps.Select(MapToDto).ToList();
    }

    public async Task<ApplicationDto> UpdateStatusAsync(int applicationId, string status, int? agentUserId = null)
    {
        var app = await _db.Applications
            .Include(a => a.Property)
            .Include(a => a.Tenant)
            .FirstOrDefaultAsync(a => a.Id == applicationId)
            ?? throw new KeyNotFoundException("Application not found.");

        if (agentUserId.HasValue)
        {
            var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == agentUserId.Value);
            if (agent == null || app.Property?.AgentId != agent.Id)
                throw new UnauthorizedAccessException("You can only update applications for your own properties.");
        }

        app.Status = status;
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Notify tenant by email
        if (app.Tenant?.Email != null)
        {
            var propertyTitle = app.Property?.Title ?? "the property";
            var (subject, body) = status == "approved"
                ? ($"Your application for {propertyTitle} was approved!",
                   $"Great news! Your rental application for <strong>{propertyTitle}</strong> has been <strong style='color:#16a34a'>approved</strong>.<br><br>The agent will be in touch shortly to arrange next steps. You can log in to your PropRent dashboard to view your application details.")
                : ($"Update on your application for {propertyTitle}",
                   $"Thank you for your interest in <strong>{propertyTitle}</strong>. Unfortunately, your application has been <strong style='color:#dc2626'>rejected</strong> at this time.<br><br>Don't be discouraged — browse other available properties on PropRent and apply again.");

            _ = SendNotificationEmailAsync(app.Tenant.Email, subject, body);
        }

        var full = await _db.Applications
            .Include(a => a.Property).ThenInclude(p => p!.Images)
            .Include(a => a.Tenant)
            .FirstAsync(a => a.Id == applicationId);

        return MapToDto(full);
    }

    public async Task WithdrawAsync(int applicationId, int tenantId)
    {
        var app = await _db.Applications.FirstOrDefaultAsync(a => a.Id == applicationId)
            ?? throw new KeyNotFoundException("Application not found.");

        if (app.TenantId != tenantId)
            throw new UnauthorizedAccessException("You can only withdraw your own applications.");

        if (app.Status != "pending")
            throw new InvalidOperationException("Only pending applications can be withdrawn.");

        _db.Applications.Remove(app);
        await _db.SaveChangesAsync();
    }

    public async Task<DashboardStatsDto> GetStatsAsync(int? userId = null, string? role = null)
    {
        var appsQuery = _db.Applications.AsQueryable();

        if (role == "agent" && userId.HasValue)
        {
            var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == userId.Value);
            if (agent != null)
            {
                var agentPropertyIds = await _db.Properties
                    .Where(p => p.AgentId == agent.Id)
                    .Select(p => p.Id).ToListAsync();
                appsQuery = appsQuery.Where(a => agentPropertyIds.Contains(a.PropertyId));
                var totalProps = agentPropertyIds.Count;
                var availProps = await _db.Properties.CountAsync(p => p.AgentId == agent.Id && p.IsAvailable);
                return new DashboardStatsDto(
                    totalProps, availProps,
                    await appsQuery.CountAsync(),
                    await appsQuery.CountAsync(a => a.Status == "pending"),
                    await appsQuery.CountAsync(a => a.Status == "approved"),
                    0
                );
            }
        }

        if (userId.HasValue && role != "admin")
            appsQuery = appsQuery.Where(a => a.TenantId == userId.Value);

        var wishlistCount = userId.HasValue && role != "admin"
            ? await _db.Wishlists.CountAsync(w => w.UserId == userId.Value)
            : await _db.Wishlists.CountAsync();

        var pendingAgents = role == "admin"
            ? await _db.Users.CountAsync(u => u.Role == "agent" && !u.IsActive)
            : 0;

        return new DashboardStatsDto(
            await _db.Properties.CountAsync(),
            await _db.Properties.CountAsync(p => p.IsAvailable),
            await appsQuery.CountAsync(),
            await appsQuery.CountAsync(a => a.Status == "pending"),
            await appsQuery.CountAsync(a => a.Status == "approved"),
            wishlistCount,
            pendingAgents
        );
    }

    private static ApplicationDto MapToDto(Application a) => new(
        a.Id, a.PropertyId,
        a.Property?.Title ?? string.Empty,
        a.Property?.Location ?? string.Empty,
        a.Property?.PropertyType ?? string.Empty,
        a.Property?.Price ?? 0,
        a.Property?.ListingType ?? string.Empty,
        a.Property?.Images.FirstOrDefault(i => i.IsPrimary)?.ImageUrl,
        a.TenantId,
        a.Tenant?.FullName ?? string.Empty,
        a.Tenant?.Email ?? string.Empty,
        a.Tenant?.Phone,
        a.Message, a.Status, a.ViewingDate, a.CreatedAt
    );

    private Task SendNotificationEmailAsync(string toEmail, string subject, string body)
        => AuthService.SendNotificationEmailWrapper(_config, toEmail, subject, body);
}
