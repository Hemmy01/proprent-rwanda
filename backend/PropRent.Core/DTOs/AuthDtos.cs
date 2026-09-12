using System.ComponentModel.DataAnnotations;

namespace PropRent.Core.DTOs;

public record RegisterRequest(
    [Required][StringLength(100, MinimumLength = 2)] string FullName,
    [Required][EmailAddress] string Email,
    [Required][StringLength(100, MinimumLength = 6)] string Password,
    [Phone] string? Phone,
    string? Role
);

public record LoginRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    UserDto User
);

public record RefreshTokenRequest(
    [Required] string Token
);

// OTP flow
public record SendOtpRequest(
    [Required][EmailAddress] string Email
);

public record VerifyOtpRequest(
    [Required][EmailAddress] string Email,
    [Required] string Code
);

// Login returns this — either full auth (OTP disabled) or just signals OTP was sent
public record LoginResponse(
    bool OtpRequired,
    string? AccessToken,
    string? RefreshToken,
    UserDto? User
);

// Forgot / reset password
public record ForgotPasswordRequest(
    [Required][EmailAddress] string Email
);

public record ResetPasswordRequest(
    [Required][EmailAddress] string Email,
    [Required] string Code,
    [Required][StringLength(100, MinimumLength = 6)] string NewPassword
);
