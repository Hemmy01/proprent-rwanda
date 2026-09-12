using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;

namespace PropRent.API.Controllers;

[ApiController]
[Route("api/applications")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly IApplicationService _apps;

    public ApplicationsController(IApplicationService apps) => _apps = apps;

    // Tenant: get own applications
    [HttpGet("my")]
    public async Task<IActionResult> GetMine()
    {
        var result = await _apps.GetByTenantAsync(GetUserId());
        return Ok(result);
    }

    // Agent: get applications for their properties
    [HttpGet("agent")]
    [Authorize(Roles = "agent")]
    public async Task<IActionResult> GetForAgent()
    {
        var result = await _apps.GetByAgentAsync(GetUserId());
        return Ok(result);
    }

    // Admin: get all applications
    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _apps.GetAllAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateApplicationRequest request)
    {
        try
        {
            var app = await _apps.CreateAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetMine), app);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}/withdraw")]
    public async Task<IActionResult> Withdraw(int id)
    {
        try
        {
            await _apps.WithdrawAsync(id, GetUserId());
            return NoContent();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // Admin: approve or reject
    [HttpPatch("{id}/status")]
    [Authorize(Roles = "admin,agent")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateApplicationStatusRequest request)
    {
        try
        {
            var isAgent = User.IsInRole("agent");
            var app = await _apps.UpdateStatusAsync(id, request.Status, isAgent ? GetUserId() : null);
            return Ok(app);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        var isAdmin = User.IsInRole("admin");
        var stats = await _apps.GetStatsAsync(isAdmin ? null : GetUserId(), role);
        return Ok(stats);
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
