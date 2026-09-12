using System.ComponentModel.DataAnnotations;

namespace PropRent.Core.DTOs;

public record PropertyDto(
    int Id,
    string Title,
    string Location,
    string PropertyType,
    string ListingType,
    decimal Price,
    int Bedrooms,
    int Bathrooms,
    int Parking,
    decimal SizeM2,
    string? Description,
    bool IsFeatured,
    bool IsAvailable,
    string ListingStatus,
    string? PrimaryImage,
    List<string> Images,
    List<string> Amenities,
    AgentDto? Agent,
    DateTime CreatedAt
);

public record AgentDto(
    int Id,
    string FullName,
    string Role,
    string? AvatarUrl,
    string? Phone,
    string? Email
);

public class PropertyFilterRequest
{
    public string? Query { get; set; }
    public string? ListingType { get; set; }
    public string? PropertyType { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? MinBedrooms { get; set; }
    public bool? AvailableOnly { get; set; }
    public string? SortBy { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record CreatePropertyRequest(
    [Required][StringLength(200, MinimumLength = 3)] string Title,
    [Required][StringLength(200, MinimumLength = 3)] string Location,
    [Required] string PropertyType,
    [Required] string ListingType,
    [Required][Range(1, double.MaxValue)] decimal Price,
    [Range(0, 20)] int Bedrooms,
    [Range(1, 20)] int Bathrooms,
    [Range(0, 20)] int Parking,
    [Required][Range(1, 10000)] decimal SizeM2,
    string? Description,
    bool IsFeatured,
    int? AgentId,
    List<string> Images,
    List<string> Amenities
);

public record UpdatePropertyRequest(
    [StringLength(200, MinimumLength = 3)] string? Title,
    [StringLength(200, MinimumLength = 3)] string? Location,
    [Range(1, double.MaxValue)] decimal? Price,
    bool? IsAvailable,
    bool? IsFeatured,
    string? Description,
    string? PropertyType,
    string? ListingType,
    [Range(0, 20)] int? Bedrooms,
    [Range(1, 20)] int? Bathrooms,
    [Range(0, 20)] int? Parking,
    [Range(1, 10000)] decimal? SizeM2
);

public record UpdateListingStatusRequest(
    [Required] string Status // approved | rejected
);
