using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record UserApiKey
{
    public UserApiKeyId Id { get; init; }
    public Guid UserId { get; init; }
    public string HashedToken { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? LastUsedAt { get; init; }
    public DateTimeOffset? RevokedAt { get; init; }
}
