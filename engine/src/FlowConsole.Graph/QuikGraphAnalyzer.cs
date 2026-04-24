using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Interfaces;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Graph.Cache;

namespace FlowConsole.Graph;

public sealed class QuikGraphAnalyzer : IGraphAnalyzer
{
    private readonly IGraphStore _graphStore;
    private readonly LruGraphCache _cache;

    public QuikGraphAnalyzer(IGraphStore graphStore, LruGraphCache cache)
    {
        _graphStore = graphStore;
        _cache = cache;
    }

    public async Task<IReadOnlyList<ElementBase>> GetBlastRadiusAsync(
        ModelId modelId, ElementId elementId, int depth, CancellationToken ct)
    {
        var snapshot = await GetOrLoadSnapshotAsync(modelId, ct);
        var ids = Algorithms.BlastRadius.Compute(snapshot.Graph, elementId, depth);
        return ResolveElements(snapshot, ids);
    }

    public async Task<IReadOnlyList<ElementBase>> GetShortestPathAsync(
        ModelId modelId, ElementId from, ElementId to, CancellationToken ct)
    {
        var snapshot = await GetOrLoadSnapshotAsync(modelId, ct);
        var ids = Algorithms.ShortestPath.Compute(snapshot.Graph, from, to);
        return ResolveElements(snapshot, ids);
    }

    public async Task<IReadOnlyList<ElementBase>> GetDependenciesAsync(
        ModelId modelId, ElementId elementId, CancellationToken ct)
    {
        var snapshot = await GetOrLoadSnapshotAsync(modelId, ct);
        var ids = TraverseTransitive(snapshot, elementId, followOutgoing: true);
        return ResolveElements(snapshot, ids);
    }

    public async Task<IReadOnlyList<ElementBase>> GetDependentsAsync(
        ModelId modelId, ElementId elementId, CancellationToken ct)
    {
        var snapshot = await GetOrLoadSnapshotAsync(modelId, ct);
        var ids = TraverseTransitive(snapshot, elementId, followOutgoing: false);
        return ResolveElements(snapshot, ids);
    }

    public async Task<GraphMetrics> ComputeMetricsAsync(ModelId modelId, CancellationToken ct)
    {
        var snapshot = await GetOrLoadSnapshotAsync(modelId, ct);
        var graph = snapshot.Graph;

        var centralityScores = Algorithms.CentralityMetrics.ComputeBetweennessCentrality(graph);
        var spof = Algorithms.CentralityMetrics.FindSinglePointsOfFailure(graph);
        var criticalPath = Algorithms.CentralityMetrics.FindCriticalPath(graph);
        var pageRankScores = Algorithms.PageRank.Compute(graph);
        var elementCoupling = Algorithms.CouplingCohesion.ComputeElementCoupling(graph);
        var communities = Algorithms.LouvainCommunity.Detect(graph);

        // Bottlenecks: elements with high betweenness centrality AND high coupling,
        // or elements with high PageRank AND high coupling when centrality is flat
        var bottlenecks = FindBottlenecks(centralityScores, pageRankScores, elementCoupling);

        return new GraphMetrics
        {
            TotalElements = graph.VertexCount,
            TotalRelationships = graph.EdgeCount,
            AvgCoupling = Algorithms.CouplingCohesion.ComputeAvgCoupling(graph),
            AvgCohesion = Algorithms.CouplingCohesion.ComputeAvgCohesion(graph),
            CriticalPath = criticalPath,
            SinglePointsOfFailure = spof,
            CentralityScores = centralityScores,
            PageRankScores = pageRankScores,
            ElementCoupling = elementCoupling,
            Communities = communities,
            Bottlenecks = bottlenecks
        };
    }

    private static IReadOnlyList<ElementId> FindBottlenecks(
        IReadOnlyDictionary<ElementId, double> centralityScores,
        IReadOnlyDictionary<ElementId, double> pageRankScores,
        IReadOnlyDictionary<ElementId, ElementCouplingMetrics> elementCoupling)
    {
        if (elementCoupling.Count == 0)
            return [];

        var avgTotalCoupling = elementCoupling.Values.Average(c => c.AfferentCoupling + c.EfferentCoupling);

        // Primary: betweenness centrality-based detection
        var maxCentrality = centralityScores.Count > 0 ? centralityScores.Values.Max() : 0;
        if (maxCentrality > 0)
        {
            var centralityThreshold = maxCentrality * 0.5;
            return centralityScores
                .Where(kvp => kvp.Value >= centralityThreshold
                              && elementCoupling.TryGetValue(kvp.Key, out var c)
                              && (c.AfferentCoupling + c.EfferentCoupling) > avgTotalCoupling)
                .OrderByDescending(kvp => kvp.Value)
                .Select(kvp => kvp.Key)
                .ToList();
        }

        // Fallback: when betweenness centrality is flat (e.g., DAG with no intermediary nodes),
        // use PageRank + coupling to identify bottleneck hubs
        if (pageRankScores.Count == 0)
            return [];

        var maxPageRank = pageRankScores.Values.Max();
        if (maxPageRank <= 0)
            return [];

        var pageRankThreshold = maxPageRank * 0.5;
        return pageRankScores
            .Where(kvp => kvp.Value >= pageRankThreshold
                          && elementCoupling.TryGetValue(kvp.Key, out var c)
                          && (c.AfferentCoupling + c.EfferentCoupling) > avgTotalCoupling)
            .OrderByDescending(kvp => kvp.Value)
            .Select(kvp => kvp.Key)
            .ToList();
    }

    private async Task<GraphSnapshot> GetOrLoadSnapshotAsync(ModelId modelId, CancellationToken ct)
    {
        var cached = _cache.Get(modelId);
        if (cached is not null)
            return cached;

        var elementsResult = await _graphStore.GetElementsAsync(modelId, null, null, ct);
        var relationshipsResult = await _graphStore.GetRelationshipsAsync(modelId, null, null, ct);

        // Analytics uses only top-level elements and relationships:
        // exclude child-level Endpoint elements and structural Contains relationships.
        var excludedIds = elementsResult.Items
            .Where(e => e.Kind == ElementKind.Endpoint)
            .Select(e => e.Id)
            .ToHashSet();

        var elements = elementsResult.Items
            .Where(e => e.Kind != ElementKind.Endpoint)
            .ToList();

        var relationships = relationshipsResult.Items
            .Where(r => r.Kind != RelationKind.Contains
                && !excludedIds.Contains(r.SourceId)
                && !excludedIds.Contains(r.TargetId))
            .ToList();

        var snapshot = GraphSnapshot.Build(elements, relationships);
        _cache.Set(modelId, snapshot);
        return snapshot;
    }

    private static IReadOnlyList<ElementId> TraverseTransitive(
        GraphSnapshot snapshot, ElementId startId, bool followOutgoing)
    {
        var graph = snapshot.Graph;
        if (!graph.ContainsVertex(startId))
            return [];

        var visited = new HashSet<ElementId> { startId };
        var queue = new Queue<ElementId>();
        queue.Enqueue(startId);
        var result = new List<ElementId>();

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();

            if (followOutgoing)
            {
                if (graph.TryGetOutEdges(current, out var outEdges))
                {
                    foreach (var edge in outEdges)
                    {
                        if (visited.Add(edge.Target))
                        {
                            result.Add(edge.Target);
                            queue.Enqueue(edge.Target);
                        }
                    }
                }
            }
            else
            {
                if (graph.TryGetInEdges(current, out var inEdges))
                {
                    foreach (var edge in inEdges)
                    {
                        if (visited.Add(edge.Source))
                        {
                            result.Add(edge.Source);
                            queue.Enqueue(edge.Source);
                        }
                    }
                }
            }
        }

        return result;
    }

    private static IReadOnlyList<ElementBase> ResolveElements(
        GraphSnapshot snapshot, IReadOnlyList<ElementId> ids)
    {
        var result = new List<ElementBase>(ids.Count);
        foreach (var id in ids)
        {
            if (snapshot.Elements.TryGetValue(id, out var element))
                result.Add(element);
        }

        return result;
    }
}
