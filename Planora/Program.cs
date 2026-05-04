using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Planora.Application;
using Planora.Infrastructure;
using Planora.Infrastructure.Data;
using Planora.Infrastructure.Identity;
using Planora.Middleware;
using Planora.Hubs;
using Serilog;
using System;
using System.Threading.Tasks;
using Planora.Services;
using Planora.Application.Interfaces;  

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/planora-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true);
var testKey = builder.Configuration["OpenAI:ApiKey"];
Console.WriteLine($">>> OpenAI Key loaded: '{testKey}'");

var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
Directory.CreateDirectory(Path.Combine(wwwrootPath, "uploads", "chat"));
builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Planora API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ✅ AddSignalR EN PREMIER
builder.Services.AddSignalR().AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

// ✅ Ensuite IHubClients — après AddSignalR
//builder.Services.AddSingleton<IHubClients>(sp =>
//{
   // var hubContext = sp.GetRequiredService<IHubContext<ChatHub>>();
    //return hubContext.Clients;
//});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<IChatNotifier, SignalRChatNotifier>();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200", "http://localhost:5000"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

static async Task SeedAdminUser(IServiceProvider services)
{
    var userManager = services.GetRequiredService<UserManager<Planora.Domain.Entities.ApplicationUser>>();

    if (await userManager.FindByEmailAsync("kdousmayla@gmail.com") != null) return;

    var admin = new Planora.Domain.Entities.ApplicationUser
    {
        FirstName = "Mayla",
        LastName = "Kdous",
        Email = "kdousmayla@gmail.com",
        UserName = "admin",
        IsActive = true
    };

    await userManager.CreateAsync(admin, "Admin@123");
    await userManager.AddToRoleAsync(admin, "Admin");
}

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
   await db.Database.MigrateAsync();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    await RoleSeeder.SeedRolesAsync(roleManager);
    await SeedAdminUser(scope.ServiceProvider);
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Planora API v1"));

// ⚠️ StaticFiles avant tout le reste
app.UseStaticFiles();

// ⚠️ CORS doit être avant Authentication, Authorization et MapControllers
app.UseCors("AllowFrontend");  // ← nom identique à AddPolicy()

app.UseAuthentication();
app.UseAuthorization();

// ⚠️ Retirer app.UseHttpsRedirection() en développement
// (cause des problèmes quand le frontend est en http)
// app.UseHttpsRedirection();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();