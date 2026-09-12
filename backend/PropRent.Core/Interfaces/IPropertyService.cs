using PropRent.Core.DTOs;

namespace PropRent.Core.Interfaces;

public interface IPropertyService
{
    Task<PagedResult<PropertyDto>> GetAllAsync(PropertyFilterRequest filter);
    Task<PropertyDto?> GetByIdAsync(int id);
    Task<List<PropertyDto>> GetByAgentAsync(int agentUserId);
    Task<PropertyDto> CreateAsync(CreatePropertyRequest request, int? agentUserId = null);
    Task<PropertyDto> UpdateAsync(int id, UpdatePropertyRequest request, int? agentUserId = null);
    Task<bool> DeleteAsync(int id, int? agentUserId = null);
    Task<bool> ToggleAvailabilityAsync(int id, int? agentUserId = null);
    Task<PropertyDto> UpdateListingStatusAsync(int id, string status);
    Task<List<PropertyDto>> GetPendingReviewAsync();
    Task<List<PropertyDto>> GetFeaturedAsync();
    Task<List<PropertyDto>> GetSimilarAsync(int propertyId, int count = 3);
}
