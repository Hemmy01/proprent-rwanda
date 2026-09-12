using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PropRent.API.Controllers;

[ApiController]
[Route("api/uploads")]
[Authorize(Roles = "admin,agent")]
public class UploadsController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public UploadsController(IWebHostEnvironment env) => _env = env;

    [HttpPost("image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "File size must be under 5MB." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!new[] { ".jpg", ".jpeg", ".png", ".webp" }.Contains(ext))
            return BadRequest(new { message = "Only JPG, PNG and WebP images are allowed." });

        var uploadsDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var url = $"{Request.Scheme}://{Request.Host}/uploads/{fileName}";
        return Ok(new { url });
    }
}
