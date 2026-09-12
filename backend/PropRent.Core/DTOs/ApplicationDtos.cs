using System.ComponentModel.DataAnnotations;

namespace PropRent.Core.DTOs;

public record ApplicationDto(
    int Id,
    int PropertyId,
    string PropertyTitle,
    string PropertyLocation,
    string PropertyType,
    decimal PropertyPrice,
    string PropertyListingType,
    string? PropertyImage,
    int TenantId,
    string TenantName,
    string TenantEmail,
    string? TenantPhone,
    string? Message,
    string Status,
    DateOnly? ViewingDate,
    DateTime CreatedAt
);

public record CreateApplicationRequest(
    [Required] int PropertyId,
    [StringLength(1000)] string? Message,
    DateOnly? ViewingDate
);

public record UpdateApplicationStatusRequest(
    [Required] string Status
);

public record DashboardStatsDto(
    int TotalProperties,
    int AvailableProperties,
    int TotalApplications,
    int PendingApplications,
    int ApprovedApplications,
    int WishlistCount,
    int PendingAgents = 0
);

public record WithdrawApplicationRequest(); // empty body, just needs the route
