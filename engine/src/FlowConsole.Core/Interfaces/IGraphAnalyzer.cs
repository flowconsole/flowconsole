using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Interfaces;

public interface IGraphAnalyzer
{
    Task<IReadOnlyList<ElementBase>> GetBlastRadiusAsync(ModelId modelId,
        ElementId elementId, int depth, CancellationToken ct);

    Task<IReadOnlyList<ElementBase>> GetShortestPathAsync(ModelId modelId,
        ElementId from, ElementId to, CancellationToken ct);

    Task<IReadOnlyList<ElementBase>> GetDependenciesAsync(ModelId modelId,
        ElementId elementId, CancellationToken ct);

    Task<IReadOnlyList<ElementBase>> GetDependentsAsync(ModelId modelId,
        ElementId elementId, CancellationToken ct);

    Task<GraphMetrics> ComputeMetricsAsync(ModelId modelId, CancellationToken ct);
}

public sealed record GraphMetrics
{
    public int TotalElements { get; init; }
    public int TotalRelationships { get; init; }
    public double AvgCoupling { get; init; }
    public double AvgCohesion { get; init; }
    public IReadOnlyList<ElementId> CriticalPath { get; init; } = [];
    public IReadOnlyList<ElementId> SinglePointsOfFailure { get; init; } = [];
    public IReadOnlyDictionary<ElementId, double> CentralityScores { get; init; } =
        new Dictionary<ElementId, double>();
    public IReadOnlyDictionary<ElementId, double> PageRankScores { get; init; } =
        new Dictionary<ElementId, double>();
    public IReadOnlyDictionary<ElementId, ElementCouplingMetrics> ElementCoupling { get; init; } =
        new Dictionary<ElementId, ElementCouplingMetrics>();
    public IReadOnlyList<CommunityCluster> Communities { get; init; } = [];
    public IReadOnlyList<ElementId> Bottlenecks { get; init; } = [];
}

public sealed record ElementCouplingMetrics
{
    public int AfferentCoupling { get; init; }
    public int EfferentCoupling { get; init; }
    public double Instability { get; init; }
}

public sealed record CommunityCluster
{
    public int CommunityId { get; init; }
    public IReadOnlyList<ElementId> Members { get; init; } = [];
}
