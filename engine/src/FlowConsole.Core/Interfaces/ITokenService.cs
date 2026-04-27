using System.Security.Claims;
using FlowConsole.Core.Entities;

namespace FlowConsole.Core.Interfaces;

public interface ITokenService
{
    Task<TokenPair> GenerateTokenPairAsync(AppUser user, IReadOnlyList<string> roles);
    Task<ClaimsPrincipal?> ValidateExpiredTokenAsync(string token);
}

public sealed record TokenPair
{
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
    public DateTimeOffset ExpiresAt { get; init; }
}
