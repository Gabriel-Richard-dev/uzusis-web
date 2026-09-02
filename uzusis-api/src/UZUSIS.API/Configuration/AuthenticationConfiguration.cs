using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using UZUSIS.Core.Enums;
using UZUSIS.Core.Settings;

namespace UZUSIS.API.Configuration;

public static class AuthenticationConfiguration
{
    public static void ConfigurarAutenticacao(this IServiceCollection service, IConfiguration configuration)
    {
        var appSettingsSection = configuration.GetSection("JwtSettings");
        service.Configure<JwtSettings>(appSettingsSection);

        service.AddAuthentication(options =>
        {
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })   .AddJwtBearer(x =>
        {
            x.RequireHttpsMetadata = false;
            x.SaveToken = true;
            x.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                ValidateIssuer = false,
                ValidateAudience = false,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(configuration.GetSection("JwtSettings")["Key"]!))
            };
        });

        service.AddAuthorization(options =>
        {
            options.AddPolicy(ETipoUsuario.Administrador.ToString(), builder =>
            {
                builder
                    .RequireAuthenticatedUser()
                    .RequireClaim("TipoUsuario", ETipoUsuario.Administrador.ToString());
            });
            options.AddPolicy(ETipoUsuario.Cliente.ToString(), builder =>
            {
                builder
                    .RequireAuthenticatedUser()
                    .RequireClaim("TipoUsuario", ETipoUsuario.Cliente.ToString());
            });
        });

        service
            .AddJwksManager()
            .UseJwtValidation();

        service
            .AddMemoryCache();

    }
}