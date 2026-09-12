namespace PropRent.Core.Models;

public class Wishlist
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int PropertyId { get; set; }
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
    public Property? Property { get; set; }
}
