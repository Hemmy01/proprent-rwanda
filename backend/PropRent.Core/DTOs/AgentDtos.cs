using System.ComponentModel.DataAnnotations;

namespace PropRent.Core.DTOs;

public record AgentProfileDto(
    int Id,
    int? UserId,
    string FullName,
    string Role,
    string? AvatarUrl,
    string? Phone,
    string? Email,
    bool IsActive,
    DateTime CreatedAt
);

public record PendingAgentDto(
    int UserId,
    int AgentId,
    string FullName,
    string Email,
    string? Phone,
    DateTime RegisteredAt
);

public record ApproveAgentRequest(
    [Required] int UserId
);
