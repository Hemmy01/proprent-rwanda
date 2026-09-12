namespace PropRent.Core.Models;

public class Property
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string PropertyType { get; set; } = string.Empty;
    public string ListingType { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Bedrooms { get; set; }
    public int Bathrooms { get; set; }
    public int Parking { get; set; }
    public decimal SizeM2 { get; set; }
    public string? Description { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsAvailable { get; set; } = true;
    public string ListingStatus { get; set; } = "approved"; // approved | pending_review | rejected
    public int? AgentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Agent? Agent { get; set; }
    public ICollection<PropertyImage> Images { get; set; } = new List<PropertyImage>();
    public ICollection<PropertyAmenity> Amenities { get; set; } = new List<PropertyAmenity>();
    public ICollection<Application> Applications { get; set; } = new List<Application>();
    public ICollection<Wishlist> Wishlist { get; set; } = new List<Wishlist>();
}
