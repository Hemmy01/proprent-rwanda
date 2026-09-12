using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;

namespace PropRent.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        try
        {
            var result = await _auth.RegisterAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try
        {
            var result = await _auth.LoginAsync(request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(429, new { message = ex.Message });
        }
    }

    [HttpPost("verify-otp")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpRequest request)
    {
        try
        {
            var result = await _auth.VerifyOtpAsync(request.Email, request.Code);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshTokenRequest request)
    {
        try
        {
            var result = await _auth.RefreshTokenAsync(request.Token);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(RefreshTokenRequest request)
    {
        await _auth.RevokeTokenAsync(request.Token);
        return NoContent();
    }

    [HttpPost("resend-otp")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> ResendOtp([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            await _auth.SendOtpAsync(request.Email);
            return Ok(new { message = "Code resent." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        await _auth.ForgotPasswordAsync(request.Email);
        return Ok(new { message = "If that email exists, a reset code has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        try
        {
            await _auth.ResetPasswordAsync(request.Email, request.Code, request.NewPassword);
            return Ok(new { message = "Password reset successfully." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }
}
