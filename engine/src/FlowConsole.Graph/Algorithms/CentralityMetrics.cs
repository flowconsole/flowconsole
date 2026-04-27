using FlowConsole.Core.ValueObjects;
using QuikGraph;

namespace FlowConsole.Graph.Algorithms;

public static class CentralityMetrics
{
    /// <summary>
    /// Computes betweenness centrality for all vertices using Brandes' algorithm.
    /// Returns normalized centrality scores (0.0 to 1.0).
    /// </summary>
    public static IReadOnlyDictionary<ElementId, double> ComputeBetweennessCentrality(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph)
    {
        var centrality = new Dictionary<ElementId, double>();
        foreach (var v in graph.Vertices)
            centrality[v] = 0.0;

        var vertices = graph.Vertices.ToList();

        foreach (var s in vertices)
        {
            var stack = new Stack<ElementId>();
            var predecessors = new Dictionary<ElementId, HashSet<ElementId>>();
            var sigma = new Dictionary<ElementId, double>();
            var dist = new Dictionary<ElementId, int>();
            var delta = new Dictionary<ElementId, double>();

            foreach (var v in vertices)
            {
                predecessors[v] = [];
                sigma[v] = 0.0;
                dist[v] = -1;
                delta[v] = 0.0;
            }

            sigma[s] = 1.0;
            dist[s] = 0;

            var queue = new Queue<ElementId>();
            queue.Enqueue(s);

            while (queue.Count > 0)
            {
                var v = queue.Dequeue();
                stack.Push(v);

                if (!graph.TryGetOutEdges(v, out var outEdges))
                    continue;

                foreach (var edge in outEdges)
                {
                    var w = edge.Target;
                    if (dist[w] < 0)
                    {
                        queue.Enqueue(w);
                        dist[w] = dist[v] + 1;
                    }

                    if (dist[w] == dist[v] + 1)
                    {
                        sigma[w] += sigma[v];
                        predecessors[w].Add(v);
                    }
                }
            }

            while (stack.Count > 0)
            {
                var w = stack.Pop();
                foreach (var v in predecessors[w])
                {
                    delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w]);
                }

                if (!w.Equals(s))
                    centrality[w] += delta[w];
            }
        }

        // Normalize
        var n = graph.VertexCount;
        if (n > 2)
        {
            var normalization = (double)((n - 1) * (n - 2));
            foreach (var v in vertices)
                centrality[v] /= normalization;
        }

        return centrality;
    }

    /// <summary>
    /// Identifies single points of failure: vertices whose removal increases
    /// the number of weakly connected components.
    /// </summary>
    public static IReadOnlyList<ElementId> FindSinglePointsOfFailure(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph)
    {
        if (graph.VertexCount <= 2)
            return [];

        var baseComponents = CountWeaklyConnectedComponents(graph, null);
        var spof = new List<ElementId>();

        foreach (var vertex in graph.Vertices)
        {
            var componentsWithout = CountWeaklyConnectedComponents(graph, vertex);
            if (componentsWithout > baseComponents)
                spof.Add(vertex);
        }

        return spof;
    }

    /// <summary>
    /// Finds the longest path in the DAG using topological ordering.
    /// Returns the path as a list of element IDs. If the graph has cycles, returns empty.
    /// </summary>
    public static IReadOnlyList<ElementId> FindCriticalPath(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph)
    {
        if (graph.VertexCount == 0)
            return [];

        // Topological sort using Kahn's algorithm
        var inDegree = new Dictionary<ElementId, int>();
        foreach (var v in graph.Vertices)
            inDegree[v] = graph.InDegree(v);

        var queue = new Queue<ElementId>();
        foreach (var v in graph.Vertices)
        {
            if (inDegree[v] == 0)
                queue.Enqueue(v);
        }

        var topoOrder = new List<ElementId>();
        while (queue.Count > 0)
        {
            var v = queue.Dequeue();
            topoOrder.Add(v);

            if (graph.TryGetOutEdges(v, out var outEdges))
            {
                foreach (var edge in outEdges)
                {
                    inDegree[edge.Target]--;
                    if (inDegree[edge.Target] == 0)
                        queue.Enqueue(edge.Target);
                }
            }
        }

        // Cycle detected
        if (topoOrder.Count != graph.VertexCount)
            return [];

        // Longest path DP
        var dist = new Dictionary<ElementId, int>();
        var predecessor = new Dictionary<ElementId, ElementId?>();
        foreach (var v in graph.Vertices)
        {
            dist[v] = 0;
            predecessor[v] = null;
        }

        foreach (var v in topoOrder)
        {
            if (graph.TryGetOutEdges(v, out var outEdges))
            {
                foreach (var edge in outEdges)
                {
                    if (dist[v] + 1 > dist[edge.Target])
                    {
                        dist[edge.Target] = dist[v] + 1;
                        predecessor[edge.Target] = v;
                    }
                }
            }
        }

        // Find the end of the longest path
        var maxDist = 0;
        var endVertex = topoOrder[0];
        foreach (var v in topoOrder)
        {
            if (dist[v] > maxDist)
            {
                maxDist = dist[v];
                endVertex = v;
            }
        }

        if (maxDist == 0)
            return [endVertex];

        // Reconstruct path
        var path = new List<ElementId>();
        ElementId? current = endVertex;
        while (current is not null)
        {
            path.Add(current.Value);
            current = predecessor[current.Value];
        }

        path.Reverse();
        return path;
    }

    private static int CountWeaklyConnectedComponents(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph,
        ElementId? excludeVertex)
    {
        var visited = new HashSet<ElementId>();
        if (excludeVertex is not null)
            visited.Add(excludeVertex.Value);

        var components = 0;

        foreach (var vertex in graph.Vertices)
        {
            if (!visited.Add(vertex))
                continue;

            components++;
            var queue = new Queue<ElementId>();
            queue.Enqueue(vertex);

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();

                if (graph.TryGetOutEdges(current, out var outEdges))
                {
                    foreach (var edge in outEdges)
                    {
                        if (visited.Add(edge.Target))
                            queue.Enqueue(edge.Target);
                    }
                }

                if (graph.TryGetInEdges(current, out var inEdges))
                {
                    foreach (var edge in inEdges)
                    {
                        if (visited.Add(edge.Source))
                            queue.Enqueue(edge.Source);
                    }
                }
            }
        }

        return components;
    }
}
