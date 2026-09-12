namespace PropRent.Core.Models;

public class Agent
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "Property Agent";
    public string? AvatarUrl { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Property> Properties { get; set; } = new List<Property>();
}
