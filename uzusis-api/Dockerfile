# Build da API (.NET 8). Contexto é a raiz do uzusis-api.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish src/UZUSIS.API/UZUSIS.API.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
# A imagem aspnet:8.0 já escuta em 8080 (ASPNETCORE_HTTP_PORTS).
EXPOSE 8080
ENTRYPOINT ["dotnet", "UZUSIS.API.dll"]
