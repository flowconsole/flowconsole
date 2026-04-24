using FlowConsole.Core.ValueObjects;
using QuikGraph;

namespace FlowConsole.Graph.Algorithms;

/// <summary>
/// PageRank algorithm for identifying important/influential elements in the graph.
/// Higher PageRank indicates the element is referenced by many other important elements.
/// </summary>
public static class PageRank
{
    /// <summary>
    /// Computes PageRank scores for all vertices.
    /// </summary>
    /// <param name="graph">The directed graph.</param>
    /// <param name="dampingFactor">Probability of following a link (default 0.85).</param>
    /// <param name="maxIterations">Maximum iterations (default 100).</param>
    /// <param name="tolerance">Convergence tolerance (default 1e-6).</param>
    /// <returns>Dictionary mapping each vertex to its PageRank score (normalized, sums to 1.0).</returns>
    public static IReadOnlyDictionary<ElementId, double> Compute(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph,
        double dampingFactor = 0.85,
        int maxIterations = 100,
        double tolerance = 1e-6)
    {
        var vertices = graph.Vertices.ToList();
        var n = vertices.Count;

        if (n == 0)
            return new Dictionary<ElementId, double>();

        // Initialize uniform distribution
        var initialRank = 1.0 / n;
        var rank = new Dictionary<ElementId, double>();
        foreach (var v in vertices)
            rank[v] = initialRank;

        for (var iter = 0; iter < maxIterations; iter++)
        {
            var newRank = new Dictionary<ElementId, double>();
            var danglingSum = 0.0;

            // Collect dangling node contribution (nodes with no out-edges)
            foreach (var v in vertices)
            {
                if (graph.OutDegree(v) == 0)
                    danglingSum += rank[v];
            }

            foreach (var v in vertices)
            {
                var sum = 0.0;

                // Sum contributions from all nodes that link to v
                if (graph.TryGetInEdges(v, out var inEdges))
                {
                    foreach (var edge in inEdges)
                    {
                        var outDegree = graph.OutDegree(edge.Source);
                        if (outDegree > 0)
                            sum += rank[edge.Source] / outDegree;
                    }
                }

                // PageRank formula: (1-d)/N + d * (sum of contributions + dangling redistribution)
                newRank[v] = (1.0 - dampingFactor) / n
                             + dampingFactor * (sum + danglingSum / n);
            }

            // Check convergence
            var diff = 0.0;
            foreach (var v in vertices)
                diff += Math.Abs(newRank[v] - rank[v]);

            rank = newRank;

            if (diff < tolerance)
                break;
        }

        return rank;
    }
}
