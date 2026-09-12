namespace PropRent.Core.Models;

public class Application
{
    public int Id { get; set; }
    public int PropertyId { get; set; }
    public int TenantId { get; set; }
    public string? Message { get; set; }
    public string Status { get; set; } = "pending";
    public DateOnly? ViewingDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Property? Property { get; set; }
    public User? Tenant { get; set; }
}
