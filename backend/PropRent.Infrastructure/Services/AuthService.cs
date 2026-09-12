using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MimeKit;
using PropRent.Core.DTOs;
using PropRent.Core.Interfaces;
using PropRent.Core.Models;
using PropRent.Infrastructure.Data;

namespace PropRent.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already registered.");

        var role = request.Role?.ToLower() == "agent" ? "agent" : "tenant";
        var isActive = role != "agent"; // agents start inactive until admin approves

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            IsActive = isActive
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Create linked Agent record for agent registrations
        if (role == "agent")
        {
            _db.Agents.Add(new Agent
            {
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                IsActive = false
            });
            await _db.SaveChangesAsync();
            // Return a minimal response — no tokens for inactive agents
            return new AuthResponse(string.Empty, string.Empty, new UserDto(
                user.Id, user.FullName, user.Email, user.Phone, user.Role, user.IsActive, user.CreatedAt, null));
        }

        return await BuildAuthResponseAsync(user);
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .Include(u => u.Preferences)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Your account is pending admin approval.");

        await SendOtpAsync(user.Email);
        return new LoginResponse(OtpRequired: true, null, null, null);
    }

    public async Task SendOtpAsync(string email)
    {
        // Rate limit: block if a code was sent in the last 60 seconds
        var recent = await _db.OtpCodes
            .Where(o => o.Email == email && !o.IsUsed)
            .OrderByDescending(o => o.ExpiresAt)
            .FirstOrDefaultAsync();
        if (recent != null && recent.ExpiresAt > DateTime.UtcNow)
            throw new InvalidOperationException("Please wait before requesting another code.");

        // Invalidate any existing unused codes for this email
        var old = await _db.OtpCodes
            .Where(o => o.Email == email && !o.IsUsed)
            .ToListAsync();
        _db.OtpCodes.RemoveRange(old);

        var code = GenerateOtpCode();
        _db.OtpCodes.Add(new OtpCode
        {
            Email = email,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddSeconds(60)
        });
        await _db.SaveChangesAsync();

        await SendEmailAsync(email, "Your PropRent Login Code", BuildOtpEmail(code, "login"));
    }

    public async Task<AuthResponse> VerifyOtpAsync(string email, string code)
    {
        var otp = await _db.OtpCodes
            .Where(o => o.Email == email && o.Code == code && !o.IsUsed)
            .OrderByDescending(o => o.ExpiresAt)
            .FirstOrDefaultAsync();

        if (otp == null || otp.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired OTP.");

        otp.IsUsed = true;
        await _db.SaveChangesAsync();

        var user = await _db.Users
            .Include(u => u.Preferences)
            .FirstAsync(u => u.Email == email);

        return await BuildAuthResponseAsync(user);
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
    {
        var stored = await _db.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == refreshToken && !r.IsRevoked);

        if (stored == null || stored.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        stored.IsRevoked = true;
        await _db.SaveChangesAsync();

        return await BuildAuthResponseAsync(stored.User!);
    }

    public async Task RevokeTokenAsync(string refreshToken)
    {
        var stored = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Token == refreshToken);
        if (stored != null) { stored.IsRevoked = true; await _db.SaveChangesAsync(); }
    }

    public async Task ForgotPasswordAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return;
        await SendOtpAsync(email);
    }

    public async Task ResetPasswordAsync(string email, string code, string newPassword)
    {
        var otp = await _db.OtpCodes
            .Where(o => o.Email == email && o.Code == code && !o.IsUsed)
            .OrderByDescending(o => o.ExpiresAt)
            .FirstOrDefaultAsync();

        if (otp == null || otp.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired OTP.");

        otp.IsUsed = true;

        var user = await _db.Users.FirstAsync(u => u.Email == email);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);

        // Invalidate all existing sessions so stolen tokens can't be reused
        var tokens = await _db.RefreshTokens.Where(r => r.UserId == user.Id && !r.IsRevoked).ToListAsync();
        foreach (var t in tokens) t.IsRevoked = true;

        await _db.SaveChangesAsync();
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(User user)
    {
        var accessToken = GenerateJwt(user);
        var refreshToken = GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });
        await _db.SaveChangesAsync();

        var prefs = user.Preferences;
        var userDto = new UserDto(
            user.Id, user.FullName, user.Email, user.Phone, user.Role, user.IsActive, user.CreatedAt,
            prefs == null ? null : new UserPreferencesDto(
                prefs.ListingType, prefs.PropertyType, prefs.MaxPrice,
                prefs.MinBedrooms, prefs.PreferredLocation)
        );

        return new AuthResponse(accessToken, refreshToken, userDto);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var cfg = _config.GetSection("Email");
        var from = cfg["From"] ?? throw new InvalidOperationException("Email:From not configured.");
        var host = cfg["Host"] ?? throw new InvalidOperationException("Email:Host not configured.");
        var port = int.Parse(cfg["Port"] ?? "587");
        var username = cfg["Username"] ?? throw new InvalidOperationException("Email:Username not configured.");
        var password = cfg["Password"] ?? throw new InvalidOperationException("Email:Password not configured.");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("PropRent Rwanda", from));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(username, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    public static async Task SendNotificationEmailWrapper(IConfiguration config, string toEmail, string subject, string htmlBody)
    {
        try
        {
            var cfg = config.GetSection("Email");
            var from = cfg["From"] ?? "noreply@proprent.rw";
            var host = cfg["Host"] ?? "smtp.gmail.com";
            var port = int.Parse(cfg["Port"] ?? "587");
            var username = cfg["Username"] ?? string.Empty;
            var password = cfg["Password"] ?? string.Empty;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("PropRent Rwanda", from));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = AuthService.BuildNotificationEmail(subject, htmlBody) };
            using var client = new SmtpClient();
            await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(username, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
        catch { /* fire-and-forget: don't fail the request if email fails */ }
    }

    private static string BuildOtpEmail(string code, string purpose) => $@"
<div style='font-family:sans-serif;max-width:400px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px'>
  <div style='font-size:22px;font-weight:700;margin-bottom:4px'>Prop<span style='color:#2563eb'>Rent</span></div>
  <p style='color:#6b7280;margin-bottom:24px'>Rwanda's AI-Powered Property Platform</p>
  <p>Your one-time {purpose} code is:</p>
  <div style='font-size:36px;font-weight:700;letter-spacing:8px;color:#2563eb;margin:16px 0'>{code}</div>
  <p style='color:#6b7280;font-size:13px'>This code expires in 1 minute. Do not share it with anyone.</p>
</div>";

    public static string BuildNotificationEmail(string title, string body) => $@"
<div style='font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px'>
  <div style='font-size:22px;font-weight:700;margin-bottom:4px'>Prop<span style='color:#2563eb'>Rent</span></div>
  <p style='color:#6b7280;margin-bottom:24px'>Rwanda's AI-Powered Property Platform</p>
  <h2 style='font-size:18px;margin-bottom:12px'>{title}</h2>
  <p style='color:#374151;line-height:1.6'>{body}</p>
  <div style='margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af'>PropRent Rwanda &mdash; info@proprent.rw</div>
</div>";

    private static string GenerateOtpCode()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var value = BitConverter.ToUInt32(bytes, 0) % 1_000_000;
        return value.ToString("D6");
    }

    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(ClaimTypes.Name, user.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpiryMinutes"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}
