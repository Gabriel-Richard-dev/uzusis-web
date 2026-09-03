using Microsoft.EntityFrameworkCore;
using UZUSIS.API.Configuration;
using UZUSIS.Application.Configuration;
using UZUSIS.Application.Contracts.Services;
using UZUSIS.Application.Dtos.Usuario;
using UZUSIS.Infra.Data.Context;
using UZUSIS.Infra.Data.Storage;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policyBuilder =>
    {
        policyBuilder.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

builder.Services.ConfigurarSwagger();

builder
    .Services
    .ConfigurarAutenticacao(builder.Configuration);

builder
    .Services
    .ConfigureApplication(builder.Configuration);

builder
    .Services
    .ConfigurarDependencias();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.GetRequiredService<ApplicationContext>().Database.MigrateAsync();
    await scope.ServiceProvider.GetRequiredService<FotoStorage>().GarantirBucket();

    var seedEmail = app.Configuration["Admin:SeedEmail"];
    var seedPassword = app.Configuration["Admin:SeedPassword"];

    if (!string.IsNullOrWhiteSpace(seedEmail) && !string.IsNullOrWhiteSpace(seedPassword))
    {
        await scope.ServiceProvider.GetRequiredService<IAdministradorService>().Criar(new AdicionarUsuarioDto
        {
            Nome = app.Configuration["Admin:SeedName"] ?? "Administrador",
            Email = seedEmail,
            Senha = seedPassword
        });
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
