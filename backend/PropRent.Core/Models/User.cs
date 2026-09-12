namespace PropRent.Core.Models;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "tenant";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public UserPreferences? Preferences { get; set; }
    public ICollection<Application> Applications { get; set; } = new List<Application>();
    public ICollection<Wishlist> Wishlist { get; set; } = new List<Wishlist>();
}
