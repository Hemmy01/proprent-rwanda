using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PropRent.API.Middleware;
using PropRent.Core.Interfaces;
using PropRent.Infrastructure.Data;
using PropRent.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 10;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("api", o =>
    {
        o.PermitLimit = 120;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });
    options.RejectionStatusCode = 429;
});

// ── Database ──────────────────────────────────────────────────────────────────
var connectionString =
    Environment.GetEnvironmentVariable("DATABASE_URL") ??
    builder.Configuration.GetConnectionString("DefaultConnection") ??
    throw new InvalidOperationException("No database connection string configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPropertyService, PropertyService>();
builder.Services.AddScoped<IApplicationService, ApplicationService>();
builder.Services.AddScoped<IWishlistService, WishlistService>();

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew                = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode  = 401;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"status\":401,\"message\":\"Unauthorized. Please log in.\"}");
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode  = 403;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"status\":403,\"message\":\"Forbidden. You do not have permission.\"}");
            }
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    var allowedOrigins = new List<string>
    {
        "http://localhost:5173",
        "http://localhost:3000"
    };
    var frontendUrl = builder.Configuration["FRONTEND_URL"];
    if (!string.IsNullOrEmpty(frontendUrl)) allowedOrigins.Add(frontendUrl);

    options.AddPolicy("FrontendPolicy", policy =>
        policy.WithOrigins(allowedOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// ── Controllers ───────────────────────────────────────────────────────────────
builder.Services.AddControllers();

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "PropRent Rwanda API",
        Version     = "v1",
        Description = "AI-Powered Online Rental & Property Sales Platform for Rwanda"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "Bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Enter your JWT token. Example: Bearer {token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();
// ─────────────────────────────────────────────────────────────────────────────

app.UseMiddleware<ExceptionMiddleware>();

// HTTPS redirect only in production — dev uses HTTP via Vite proxy
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseRateLimiter();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "PropRent Rwanda API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("FrontendPolicy");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
