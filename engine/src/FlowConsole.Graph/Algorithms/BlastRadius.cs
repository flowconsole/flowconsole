using FlowConsole.Core.ValueObjects;
using QuikGraph;

namespace FlowConsole.Graph.Algorithms;

public static class BlastRadius
{
    /// <summary>
    /// BFS traversal from element following both incoming and outgoing edges up to depth N.
    /// Returns all reachable element IDs (excluding the start element).
    /// </summary>
    public static IReadOnlyList<ElementId> Compute(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph,
        ElementId startId,
        int depth)
    {
        if (!graph.ContainsVertex(startId) || depth <= 0)
            return [];

        var visited = new HashSet<ElementId> { startId };
        var queue = new Queue<(ElementId Id, int Depth)>();
        queue.Enqueue((startId, 0));
        var result = new List<ElementId>();

        while (queue.Count > 0)
        {
            var (current, currentDepth) = queue.Dequeue();
            if (currentDepth >= depth)
                continue;

            // Follow outgoing edges
            if (graph.TryGetOutEdges(current, out var outEdges))
            {
                foreach (var edge in outEdges)
                {
                    if (visited.Add(edge.Target))
                    {
                        result.Add(edge.Target);
                        queue.Enqueue((edge.Target, currentDepth + 1));
                    }
                }
            }

            // Follow incoming edges (bidirectional blast radius)
            if (graph.TryGetInEdges(current, out var inEdges))
            {
                foreach (var edge in inEdges)
                {
                    if (visited.Add(edge.Source))
                    {
                        result.Add(edge.Source);
                        queue.Enqueue((edge.Source, currentDepth + 1));
                    }
                }
            }
        }

        return result;
    }
}
