using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PropRent.Core.DTOs;
using PropRent.Infrastructure.Data;
using PropRent.Infrastructure.Services;
using Microsoft.Extensions.Configuration;

namespace PropRent.API.Controllers;

[ApiController]
[Route("api/agents")]
[Authorize]
public class AgentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AgentsController(AppDbContext db, IConfiguration config) { _db = db; _config = config; }

    // Admin: list all pending agents awaiting approval
    [HttpGet("pending")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetPending()
    {
        var pendingUsers = await _db.Users
            .Where(u => u.Role == "agent" && !u.IsActive)
            .ToListAsync();

        var userIds = pendingUsers.Select(u => u.Id).ToList();
        var agentMap = await _db.Agents
            .Where(a => a.UserId != null && userIds.Contains(a.UserId!.Value))
            .ToDictionaryAsync(a => a.UserId!.Value, a => a.Id);

        var pending = pendingUsers.Select(u => new PendingAgentDto(
            u.Id,
            agentMap.TryGetValue(u.Id, out var agentId) ? agentId : 0,
            u.FullName,
            u.Email,
            u.Phone,
            u.CreatedAt
        )).ToList();

        return Ok(pending);
    }

    // Admin: list all active approved agents (with linked user accounts only)
    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAll()
    {
        var agents = await _db.Agents
            .Where(a => a.UserId != null && a.IsActive)
            .Select(a => new AgentProfileDto(
                a.Id, a.UserId, a.FullName, a.Role,
                a.AvatarUrl, a.Phone, a.Email, a.IsActive, a.CreatedAt
            ))
            .ToListAsync();
        return Ok(agents);
    }

    // Admin: approve an agent
    [HttpPost("{userId}/approve")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Approve(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.Role != "agent") return NotFound();

        user.IsActive = true;

        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == userId);
        if (agent != null) agent.IsActive = true;

        await _db.SaveChangesAsync();

        _ = AuthService.SendNotificationEmailWrapper(_config, user.Email,
            "Your PropRent Agent Account is Approved!",
            $"Congratulations, <strong>{user.FullName}</strong>! Your agent account has been <strong style='color:#16a34a'>approved</strong>. You can now log in and start listing properties on PropRent.");

        return Ok(new { message = $"{user.FullName} has been approved as an agent." });
    }

    // Admin: reject/deactivate an agent
    [HttpPost("{userId}/reject")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Reject(int userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.Role != "agent") return NotFound();

        user.IsActive = false;

        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == userId);
        if (agent != null) agent.IsActive = false;

        await _db.SaveChangesAsync();

        _ = AuthService.SendNotificationEmailWrapper(_config, user.Email,
            "Update on Your PropRent Agent Application",
            $"Hi <strong>{user.FullName}</strong>, unfortunately your agent account application has been <strong style='color:#dc2626'>rejected</strong>. Please contact support if you believe this is an error.");

        return Ok(new { message = $"{user.FullName}'s agent account has been rejected." });
    }

    // Agent: get own profile
    [HttpGet("me")]
    [Authorize(Roles = "agent")]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = GetUserId();
        var agent = await _db.Agents.FirstOrDefaultAsync(a => a.UserId == userId);
        if (agent == null) return NotFound();

        return Ok(new AgentProfileDto(
            agent.Id, agent.UserId, agent.FullName, agent.Role,
            agent.AvatarUrl, agent.Phone, agent.Email, agent.IsActive, agent.CreatedAt
        ));
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
