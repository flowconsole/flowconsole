using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Shared.Paging;

namespace FlowConsole.Core.Interfaces;

public interface IDriftSnapshotRepository
{
    Task<DriftSnapshot?> GetByIdAsync(DriftSnapshotId id, CancellationToken ct);
    Task<PagedResult<DriftSnapshot>> GetByModelAsync(ModelId modelId, PagedQuery query, CancellationToken ct);
    Task<DriftSnapshot?> GetLatestAsync(ModelId modelId, CancellationToken ct);
    Task<DriftSnapshot> CreateAsync(DriftSnapshot snapshot, CancellationToken ct);
}
