using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;

namespace PropRent.API.Controllers;

[ApiController]
[Route("api/properties")]
public class PropertiesController : ControllerBase
{
    private readonly IPropertyService _properties;

    public PropertiesController(IPropertyService properties) => _properties = properties;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PropertyFilterRequest filter)
    {
        var result = await _properties.GetAllAsync(filter);
        return Ok(result);
    }

    [HttpGet("featured")]
    public async Task<IActionResult> GetFeatured()
    {
        var result = await _properties.GetFeaturedAsync();
        return Ok(result);
    }

    [HttpGet("pending-review")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetPendingReview()
    {
        var result = await _properties.GetPendingReviewAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var property = await _properties.GetByIdAsync(id);
        return property == null ? NotFound() : Ok(property);
    }

    [HttpGet("{id}/similar")]
    public async Task<IActionResult> GetSimilar(int id)
    {
        var result = await _properties.GetSimilarAsync(id);
        return Ok(result);
    }

    [HttpPatch("{id}/listing-status")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateListingStatus(int id, UpdateListingStatusRequest request)
    {
        try
        {
            var property = await _properties.UpdateListingStatusAsync(id, request.Status);
            return Ok(property);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("agent/mine")]
    [Authorize(Roles = "agent")]
    public async Task<IActionResult> GetMyProperties()
    {
        var result = await _properties.GetByAgentAsync(GetUserId());
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "admin,agent")]
    public async Task<IActionResult> Create(CreatePropertyRequest request)
    {
        try
        {
            var agentUserId = User.IsInRole("agent") ? GetUserId() : (int?)null;
            var property = await _properties.CreateAsync(request, agentUserId);
            return CreatedAtAction(nameof(GetById), new { id = property.Id }, property);
        }
        catch (UnauthorizedAccessException ex) { return Forbid(); }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin,agent")]
    public async Task<IActionResult> Update(int id, UpdatePropertyRequest request)
    {
        try
        {
            var agentUserId = User.IsInRole("agent") ? GetUserId() : (int?)null;
            var property = await _properties.UpdateAsync(id, request, agentUserId);
            return Ok(property);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPatch("{id}/toggle-availability")]
    [Authorize(Roles = "admin,agent")]
    public async Task<IActionResult> ToggleAvailability(int id)
    {
        try
        {
            var agentUserId = User.IsInRole("agent") ? GetUserId() : (int?)null;
            var isAvailable = await _properties.ToggleAvailabilityAsync(id, agentUserId);
            return Ok(new { isAvailable });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin,agent")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var agentUserId = User.IsInRole("agent") ? GetUserId() : (int?)null;
            var deleted = await _properties.DeleteAsync(id, agentUserId);
            return deleted ? NoContent() : NotFound();
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    private int GetUserId() =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
