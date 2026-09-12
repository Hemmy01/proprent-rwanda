FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish PropRent.API/PropRent.API.csproj -c Release -o /app/out

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/out .
EXPOSE 10000
ENV ASPNETCORE_URLS=http://+:10000
ENTRYPOINT ["dotnet", "PropRent.API.dll"]
