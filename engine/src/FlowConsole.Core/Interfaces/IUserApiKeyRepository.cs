using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Interfaces;

public interface IUserApiKeyRepository
{
    Task<UserApiKey?> GetByHashedTokenAsync(string hashedToken, CancellationToken ct);
    Task<UserApiKey?> GetByIdAsync(UserApiKeyId id, CancellationToken ct);
    Task<IReadOnlyList<UserApiKey>> GetByUserAsync(Guid userId, CancellationToken ct);
    Task<UserApiKey> CreateAsync(UserApiKey key, CancellationToken ct);
    Task<UserApiKey> UpdateAsync(UserApiKey key, CancellationToken ct);
    Task UpdateLastUsedAtAsync(string hashedToken, DateTimeOffset usedAt, CancellationToken ct);
}
