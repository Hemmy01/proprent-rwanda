using PropRent.Core.DTOs;

namespace PropRent.Core.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
    Task RevokeTokenAsync(string refreshToken);
    Task SendOtpAsync(string email);
    Task<AuthResponse> VerifyOtpAsync(string email, string code);
    Task ForgotPasswordAsync(string email);
    Task ResetPasswordAsync(string email, string code, string newPassword);
}
