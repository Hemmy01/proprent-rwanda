using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropRent.Core.Interfaces;

namespace PropRent.API.Controllers;

[ApiController]
[Route("api/wishlist")]
[Authorize]
public class WishlistController : ControllerBase
{
    private readonly IWishlistService _wishlist;

    public WishlistController(IWishlistService wishlist) => _wishlist = wishlist;

    [HttpGet]
    public async Task<IActionResult> GetMine()
    {
        var result = await _wishlist.GetByUserAsync(GetUserId());
        return Ok(result);
    }

    [HttpPost("{propertyId}")]
    public async Task<IActionResult> Toggle(int propertyId)
    {
        var added = await _wishlist.ToggleAsync(GetUserId(), propertyId);
        return Ok(new { added, message = added ? "Saved to wishlist" : "Removed from wishlist" });
    }

    [HttpGet("{propertyId}/status")]
    public async Task<IActionResult> CheckStatus(int propertyId)
    {
        var inWishlist = await _wishlist.IsInWishlistAsync(GetUserId(), propertyId);
        return Ok(new { inWishlist });
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
