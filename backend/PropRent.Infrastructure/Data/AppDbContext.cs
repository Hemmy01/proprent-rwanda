using Microsoft.EntityFrameworkCore;
using PropRent.Core.Models;

namespace PropRent.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<PropertyImage> PropertyImages => Set<PropertyImage>();
    public DbSet<PropertyAmenity> PropertyAmenities => Set<PropertyAmenity>();
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasDefaultValue("tenant");
        });

        mb.Entity<UserPreferences>(e =>
        {
            e.HasOne(p => p.User).WithOne(u => u.Preferences)
             .HasForeignKey<UserPreferences>(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        mb.Entity<Agent>(e =>
        {
            // Filtered unique index — allows multiple NULLs, enforces uniqueness only on non-null values
            e.HasIndex(a => a.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");
        });

        mb.Entity<Property>(e =>
        {
            e.HasOne(p => p.Agent).WithMany(a => a.Properties)
             .HasForeignKey(p => p.AgentId)
             .OnDelete(DeleteBehavior.SetNull);
            e.Property(p => p.Price).HasColumnType("decimal(18,2)");
            e.Property(p => p.SizeM2).HasColumnType("decimal(10,2)");
        });

        mb.Entity<Application>(e =>
        {
            e.HasOne(a => a.Property).WithMany(p => p.Applications)
             .HasForeignKey(a => a.PropertyId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Tenant).WithMany(u => u.Applications)
             .HasForeignKey(a => a.TenantId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(a => new { a.PropertyId, a.TenantId }).IsUnique();
        });

        mb.Entity<Wishlist>(e =>
        {
            // Match SQL schema: Users cascade, Properties NO ACTION to avoid multiple cascade paths
            e.HasOne(w => w.User).WithMany(u => u.Wishlist)
             .HasForeignKey(w => w.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(w => w.Property).WithMany(p => p.Wishlist)
             .HasForeignKey(w => w.PropertyId)
             .OnDelete(DeleteBehavior.NoAction);
            e.HasIndex(w => new { w.UserId, w.PropertyId }).IsUnique();
            // Map to exact SQL table name
            e.ToTable("Wishlist");
        });
    }
}
