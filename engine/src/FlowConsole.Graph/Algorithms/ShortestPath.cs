using FlowConsole.Core.ValueObjects;
using QuikGraph;

namespace FlowConsole.Graph.Algorithms;

public static class ShortestPath
{
    /// <summary>
    /// BFS shortest path between two elements following outgoing edges.
    /// Returns the path as a list of element IDs from source to target (inclusive),
    /// or empty list if no path exists.
    /// </summary>
    public static IReadOnlyList<ElementId> Compute(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph,
        ElementId from,
        ElementId to)
    {
        if (!graph.ContainsVertex(from) || !graph.ContainsVertex(to))
            return [];

        if (from.Equals(to))
            return [from];

        var visited = new HashSet<ElementId> { from };
        var parent = new Dictionary<ElementId, ElementId>();
        var queue = new Queue<ElementId>();
        queue.Enqueue(from);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();

            if (graph.TryGetOutEdges(current, out var outEdges))
            {
                foreach (var edge in outEdges)
                {
                    if (!visited.Add(edge.Target))
                        continue;

                    parent[edge.Target] = current;

                    if (edge.Target.Equals(to))
                        return ReconstructPath(parent, from, to);

                    queue.Enqueue(edge.Target);
                }
            }
        }

        return [];
    }

    private static IReadOnlyList<ElementId> ReconstructPath(
        Dictionary<ElementId, ElementId> parent,
        ElementId from,
        ElementId to)
    {
        var path = new List<ElementId>();
        var current = to;

        while (!current.Equals(from))
        {
            path.Add(current);
            current = parent[current];
        }

        path.Add(from);
        path.Reverse();
        return path;
    }
}
