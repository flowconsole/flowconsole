using FlowConsole.Core.Interfaces;
using FlowConsole.Core.ValueObjects;
using QuikGraph;

namespace FlowConsole.Graph.Algorithms;

public static class CouplingCohesion
{
    /// <summary>
    /// Computes per-element coupling metrics: afferent (Ca), efferent (Ce), and instability = Ce/(Ca+Ce).
    /// </summary>
    public static IReadOnlyDictionary<ElementId, ElementCouplingMetrics> ComputeElementCoupling(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph)
    {
        var result = new Dictionary<ElementId, ElementCouplingMetrics>();

        foreach (var vertex in graph.Vertices)
        {
            var ca = graph.InDegree(vertex);   // afferent: incoming dependencies
            var ce = graph.OutDegree(vertex);   // efferent: outgoing dependencies
            var total = ca + ce;
            var instability = total > 0 ? (double)ce / total : 0.0;

            result[vertex] = new ElementCouplingMetrics
            {
                AfferentCoupling = ca,
                EfferentCoupling = ce,
                Instability = instability
            };
        }

        return result;
    }

    /// <summary>
    /// Computes average coupling (average total degree: in-degree + out-degree per vertex).
    /// </summary>
    public static double ComputeAvgCoupling(BidirectionalGraph<ElementId, SEdge<ElementId>> graph)
    {
        if (graph.VertexCount == 0)
            return 0.0;

        var totalDegree = 0;
        foreach (var vertex in graph.Vertices)
        {
            totalDegree += graph.OutDegree(vertex) + graph.InDegree(vertex);
        }

        return (double)totalDegree / graph.VertexCount;
    }

    /// <summary>
    /// Computes average cohesion using local clustering coefficient.
    /// For each vertex, measures the fraction of possible edges between its neighbors that actually exist.
    /// Treats the graph as undirected for neighborhood calculation.
    /// </summary>
    public static double ComputeAvgCohesion(BidirectionalGraph<ElementId, SEdge<ElementId>> graph)
    {
        if (graph.VertexCount == 0)
            return 0.0;

        var totalCoefficient = 0.0;
        var countable = 0;

        foreach (var vertex in graph.Vertices)
        {
            var neighbors = new HashSet<ElementId>();

            if (graph.TryGetOutEdges(vertex, out var outEdges))
            {
                foreach (var e in outEdges)
                    neighbors.Add(e.Target);
            }

            if (graph.TryGetInEdges(vertex, out var inEdges))
            {
                foreach (var e in inEdges)
                    neighbors.Add(e.Source);
            }

            neighbors.Remove(vertex);
            var k = neighbors.Count;

            if (k < 2)
                continue;

            countable++;

            // Count edges between neighbors (in either direction)
            var edgesBetweenNeighbors = 0;
            foreach (var n1 in neighbors)
            {
                if (graph.TryGetOutEdges(n1, out var n1Out))
                {
                    foreach (var e in n1Out)
                    {
                        if (neighbors.Contains(e.Target))
                            edgesBetweenNeighbors++;
                    }
                }
            }

            // For directed: max possible = k * (k - 1)
            var maxPossible = k * (k - 1);
            totalCoefficient += (double)edgesBetweenNeighbors / maxPossible;
        }

        return countable > 0 ? totalCoefficient / countable : 0.0;
    }
}
