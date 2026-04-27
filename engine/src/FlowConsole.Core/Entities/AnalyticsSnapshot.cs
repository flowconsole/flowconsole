using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record AnalyticsSnapshot
{
    public AnalyticsSnapshotId Id { get; init; }
    public ModelId ModelId { get; init; }
    public AnalyticsMetrics Metrics { get; init; } = new();
    public DateTimeOffset ComputedAt { get; init; }
}

public sealed record AnalyticsMetrics
{
    public int TotalElements { get; init; }
    public int TotalRelationships { get; init; }
    public double AvgCoupling { get; init; }
    public double AvgCohesion { get; init; }
    public IReadOnlyList<string> CriticalPath { get; init; } = [];
    public IReadOnlyList<string> SinglePointsOfFailure { get; init; } = [];
    public IReadOnlyDictionary<string, double> CentralityScores { get; init; } = new Dictionary<string, double>();
    public IReadOnlyDictionary<string, double> PageRankScores { get; init; } = new Dictionary<string, double>();
    public IReadOnlyDictionary<string, ElementCouplingInfo> ElementCoupling { get; init; } = new Dictionary<string, ElementCouplingInfo>();
    public IReadOnlyList<CommunityInfo> Communities { get; init; } = [];
    public IReadOnlyList<string> Bottlenecks { get; init; } = [];
}

public sealed record ElementCouplingInfo
{
    public int AfferentCoupling { get; init; }
    public int EfferentCoupling { get; init; }
    public double Instability { get; init; }
}

public sealed record CommunityInfo
{
    public int CommunityId { get; init; }
    public IReadOnlyList<string> Members { get; init; } = [];
}
