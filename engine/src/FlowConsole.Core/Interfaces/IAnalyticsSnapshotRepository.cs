using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Interfaces;

public interface IAnalyticsSnapshotRepository
{
    Task<AnalyticsSnapshot?> GetByModelIdAsync(ModelId modelId, CancellationToken ct);
    Task UpsertAsync(AnalyticsSnapshot snapshot, CancellationToken ct);
}
