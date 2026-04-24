using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record DriftSnapshot
{
    public DriftSnapshotId Id { get; init; }
    public ModelId ModelId { get; init; }
    public ScanId? ScanId { get; init; }
    public decimal DriftScore { get; init; }
    public int AddedElements { get; init; }
    public int RemovedElements { get; init; }
    public int ChangedElements { get; init; }
    public DriftResult Details { get; init; } = new();
    public DateTimeOffset ComputedAt { get; init; }
}

public sealed record DriftResult
{
    public decimal DriftScore { get; init; }
    public IReadOnlyList<DriftItem> Added { get; init; } = [];
    public IReadOnlyList<DriftItem> Removed { get; init; } = [];
    public IReadOnlyList<DriftItem> Changed { get; init; } = [];
}

public sealed record DriftItem
{
    public ElementId ElementId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Kind { get; init; } = string.Empty;
    public string? DiffDescription { get; init; }
}
