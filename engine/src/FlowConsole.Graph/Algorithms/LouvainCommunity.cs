using FlowConsole.Core.Interfaces;
using FlowConsole.Core.ValueObjects;
using QuikGraph;

namespace FlowConsole.Graph.Algorithms;

/// <summary>
/// Louvain community detection algorithm for identifying clusters in graphs.
/// Treats the graph as undirected for community detection purposes.
/// </summary>
public static class LouvainCommunity
{
    /// <summary>
    /// Detects communities using a simplified Louvain algorithm.
    /// Returns a list of communities, each containing its member element IDs.
    /// </summary>
    public static IReadOnlyList<CommunityCluster> Detect(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph)
    {
        if (graph.VertexCount == 0)
            return [];

        var vertices = graph.Vertices.ToList();

        // Build undirected adjacency with edge weights (each edge = weight 1)
        var neighbors = new Dictionary<ElementId, HashSet<ElementId>>();
        foreach (var v in vertices)
            neighbors[v] = [];

        foreach (var edge in graph.Edges)
        {
            neighbors[edge.Source].Add(edge.Target);
            neighbors[edge.Target].Add(edge.Source);
        }

        // Total edges (undirected)
        var totalEdges = 0;
        foreach (var v in vertices)
            totalEdges += neighbors[v].Count;
        var m = totalEdges / 2.0; // each edge counted twice

        if (m == 0)
        {
            // No edges: each vertex is its own community
            return vertices.Select((v, i) => new CommunityCluster
            {
                CommunityId = i,
                Members = [v]
            }).ToList();
        }

        // Initialize: each vertex in its own community
        var community = new Dictionary<ElementId, int>();
        for (var i = 0; i < vertices.Count; i++)
            community[vertices[i]] = i;

        // Degree of each vertex (undirected)
        var degree = new Dictionary<ElementId, int>();
        foreach (var v in vertices)
            degree[v] = neighbors[v].Count;

        // Pre-compute community degree sums (maintained incrementally)
        var communityDegreeSum = new Dictionary<int, int>();
        foreach (var v in vertices)
        {
            var c = community[v];
            communityDegreeSum.TryGetValue(c, out var sum);
            communityDegreeSum[c] = sum + degree[v];
        }

        var improved = true;
        var maxIterations = 50;
        var iteration = 0;

        while (improved && iteration < maxIterations)
        {
            improved = false;
            iteration++;

            foreach (var v in vertices)
            {
                var currentCommunity = community[v];
                var bestCommunity = currentCommunity;
                var bestGain = 0.0;

                // Calculate neighbor communities and their edge counts
                var neighborCommunities = new Dictionary<int, int>();
                foreach (var n in neighbors[v])
                {
                    var nc = community[n];
                    neighborCommunities.TryGetValue(nc, out var count);
                    neighborCommunities[nc] = count + 1;
                }

                // Remove v from its community for calculation
                var ki = degree[v];
                var currentSum = communityDegreeSum.GetValueOrDefault(currentCommunity, 0) - ki;
                neighborCommunities.TryGetValue(currentCommunity, out var kinCurrent);

                // Modularity gain of removing v from current community
                var removeLoss = kinCurrent / m - (currentSum * ki) / (2.0 * m * m);

                foreach (var (targetCommunity, kinTarget) in neighborCommunities)
                {
                    if (targetCommunity == currentCommunity)
                        continue;

                    var targetSum = communityDegreeSum.GetValueOrDefault(targetCommunity, 0);

                    // Modularity gain of adding v to target community
                    var addGain = kinTarget / m - (targetSum * ki) / (2.0 * m * m);
                    var totalGain = addGain - removeLoss;

                    if (totalGain > bestGain)
                    {
                        bestGain = totalGain;
                        bestCommunity = targetCommunity;
                    }
                }

                if (bestCommunity != currentCommunity)
                {
                    // Update community degree sums incrementally
                    communityDegreeSum[currentCommunity] = communityDegreeSum.GetValueOrDefault(currentCommunity, 0) - ki;
                    communityDegreeSum[bestCommunity] = communityDegreeSum.GetValueOrDefault(bestCommunity, 0) + ki;
                    community[v] = bestCommunity;
                    improved = true;
                }
            }
        }

        // Group vertices by community
        var groups = new Dictionary<int, List<ElementId>>();
        foreach (var v in vertices)
        {
            var c = community[v];
            if (!groups.TryGetValue(c, out var list))
            {
                list = [];
                groups[c] = list;
            }
            list.Add(v);
        }

        // Assign sequential community IDs
        var result = new List<CommunityCluster>();
        var id = 0;
        foreach (var (_, members) in groups.OrderByDescending(g => g.Value.Count))
        {
            result.Add(new CommunityCluster
            {
                CommunityId = id++,
                Members = members
            });
        }

        return result;
    }
}
