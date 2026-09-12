using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;

namespace PropRent.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;

    public UsersController(IUserService users) => _users = users;

    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAll()
    {
        var users = await _users.GetAllAsync();
        return Ok(users);
    }

    [HttpPatch("{id}/toggle-active")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        try
        {
            var user = await _users.ToggleActiveAsync(id);
            return Ok(user);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetUserId();
        var user = await _users.GetByIdAsync(userId);
        return Ok(user);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        try
        {
            var userId = GetUserId();
            var user = await _users.UpdateProfileAsync(userId, request);
            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("me/preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        var prefs = await _users.GetPreferencesAsync(GetUserId());
        return Ok(prefs);
    }

    [HttpPut("me/preferences")]
    public async Task<IActionResult> UpsertPreferences(UserPreferencesDto request)
    {
        var prefs = await _users.UpsertPreferencesAsync(GetUserId(), request);
        return Ok(prefs);
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
