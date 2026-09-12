using System.Net;
using System.Text.Json;

namespace PropRent.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = ex switch
        {
            KeyNotFoundException       => (HttpStatusCode.NotFound,           ex.Message),
            InvalidOperationException  => (HttpStatusCode.BadRequest,         ex.Message),
            UnauthorizedAccessException=> (HttpStatusCode.Unauthorized,       ex.Message),
            ArgumentException          => (HttpStatusCode.BadRequest,         ex.Message),
            _                          => (HttpStatusCode.InternalServerError, ex.Message + " | " + ex.InnerException?.Message)
        };

        context.Response.StatusCode = (int)statusCode;

        var response = new
        {
            status  = (int)statusCode,
            message,
            timestamp = DateTime.UtcNow
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(response,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}
