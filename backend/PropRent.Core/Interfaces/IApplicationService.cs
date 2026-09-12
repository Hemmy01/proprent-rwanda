using PropRent.Core.DTOs;

namespace PropRent.Core.Interfaces;

public interface IApplicationService
{
    Task<List<ApplicationDto>> GetByTenantAsync(int tenantId);
    Task<List<ApplicationDto>> GetAllAsync();
    Task<List<ApplicationDto>> GetByAgentAsync(int agentUserId);
    Task<ApplicationDto> CreateAsync(int tenantId, CreateApplicationRequest request);
    Task<ApplicationDto> UpdateStatusAsync(int applicationId, string status, int? agentUserId = null);
    Task WithdrawAsync(int applicationId, int tenantId);
    Task<DashboardStatsDto> GetStatsAsync(int? userId = null, string? role = null);
}

public interface IWishlistService
{
    Task<List<PropertyDto>> GetByUserAsync(int userId);
    Task<bool> ToggleAsync(int userId, int propertyId);
    Task<bool> IsInWishlistAsync(int userId, int propertyId);
}
