namespace PropRent.Core.Models;

public class UserPreferences
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? ListingType { get; set; }
    public string? PropertyType { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? MinBedrooms { get; set; }
    public string? PreferredLocation { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
