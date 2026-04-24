using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Shared.Paging;

namespace FlowConsole.Core.Interfaces;

public interface IScanRepository
{
    Task<Scan?> GetByIdAsync(ScanId id, CancellationToken ct);
    Task<PagedResult<Scan>> GetByModelAsync(ModelId modelId, PagedQuery query, CancellationToken ct,
        string? statusFilter = null, string? typeFilter = null);
    Task<Scan> CreateAsync(Scan scan, CancellationToken ct);
    Task<Scan> UpdateAsync(Scan scan, CancellationToken ct);
    Task DeleteAsync(ScanId id, CancellationToken ct);

    /// <summary>Returns scans stuck in 'running' or 'cancelling' state (stale after restart).</summary>
    Task<IReadOnlyList<Scan>> GetStaleAsync(CancellationToken ct);

    /// <summary>Returns the most recent completed scan for the given model and scan type.</summary>
    Task<Scan?> GetPreviousCompletedAsync(ModelId modelId, ElementSource scanType, CancellationToken ct);

    /// <summary>
    /// Atomically transitions a scan's status from <paramref name="fromStatus"/> to <paramref name="toStatus"/>.
    /// Also sets StartedAt = now() when transitioning to 'running'.
    /// Returns the number of rows updated (0 if the scan was not in the expected state).
    /// </summary>
    Task<int> TransitionStatusAsync(ScanId id, string fromStatus, string toStatus, CancellationToken ct);
}
