using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Execution;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// In-memory path finder for flow rules. Builds an adjacency list from
/// relationships and finds paths with depth limits, via filtering, and cycle handling.
/// </summary>
public sealed class InMemoryPathFinder : IPathFinder
{
    private const long MaxPaths = 10_000_000_000;

    private readonly IReadOnlyList<ElementRef> _elements;
    private readonly IReadOnlyList<RelationshipRef> _relationships;
    private readonly SelectorMatcher _matcher;

    public InMemoryPathFinder(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships,
        IExpressionEvaluator? evaluator = null)
    {
        _elements = elements;
        _relationships = relationships;
        _matcher = new SelectorMatcher(evaluator);
    }

    public PathFinderResult FindPaths(
        CompiledSelector from,
        CompiledSelector to,
        CompiledSelector? via,
        ViaMode viaMode,
        int maxDepth,
        bool allowCycles,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies)
    {
        // Filter elements and relationships by rule-level sourceFamilies
        var filteredElements = FilterBySourceFamilies(_elements, ruleSourceFamilies);
        var filteredRelationships = FilterRelationshipsBySourceFamilies(_relationships, ruleSourceFamilies);

        // Resolve from/to endpoints
        var fromElements = _matcher.MatchElements(from, filteredElements);
        var toElements = _matcher.MatchElements(to, filteredElements);

        if (fromElements.Count == 0 || toElements.Count == 0)
        {
            return new PathFinderResult
            {
                Error = new RuleExecutionError("", DiagnosticCodes.RE_PATH_ENDPOINTS_EMPTY,
                    $"Path endpoints are empty: from matched {fromElements.Count} elements, to matched {toElements.Count} elements")
            };
        }

        // Resolve via set if provided
        HashSet<string>? viaSet = null;
        if (via is not null)
        {
            var viaElements = _matcher.MatchElements(via, filteredElements);
            viaSet = viaElements.Select(e => e.Id).ToHashSet();
        }

        // Build element lookup
        var elementById = filteredElements.ToDictionary(e => e.Id);

        // Build adjacency structure with relationship tracking
        var adjacency = new Dictionary<string, List<(string targetId, RelationshipRef rel)>>();
        foreach (var rel in filteredRelationships)
        {
            if (!elementById.ContainsKey(rel.SourceId) || !elementById.ContainsKey(rel.TargetId))
                continue;

            if (!adjacency.TryGetValue(rel.SourceId, out var neighbors))
            {
                neighbors = [];
                adjacency[rel.SourceId] = neighbors;
            }
            neighbors.Add((rel.TargetId, rel));
        }

        var fromIds = fromElements.Select(e => e.Id).ToHashSet();
        var toIds = toElements.Select(e => e.Id).ToHashSet();

        var allPaths = new List<PathRef>();

        foreach (var startElement in fromElements)
        {
            foreach (var endElement in toElements)
            {
                var paths = FindAllPaths(
                    startElement.Id,
                    endElement.Id,
                    adjacency,
                    elementById,
                    viaSet,
                    viaMode,
                    maxDepth,
                    allowCycles);

                allPaths.AddRange(paths);

                if ((long)allPaths.Count > MaxPaths)
                {
                    return new PathFinderResult
                    {
                        Error = new RuleExecutionError("", DiagnosticCodes.RE_PATH_TOO_MANY_RESULTS,
                            $"Path search exceeded {MaxPaths} results limit — narrow from/to selectors or reduce maxDepth")
                    };
                }
            }
        }

        return new PathFinderResult { Paths = allPaths };
    }

    private static List<PathRef> FindAllPaths(
        string startId,
        string endId,
        Dictionary<string, List<(string targetId, RelationshipRef rel)>> adjacency,
        Dictionary<string, ElementRef> elementById,
        HashSet<string>? viaSet,
        ViaMode viaMode,
        int maxDepth,
        bool allowCycles)
    {
        var results = new List<PathRef>();

        // DFS with backtracking
        var pathNodes = new List<string> { startId };
        var pathEdges = new List<RelationshipRef>();
        var visitedVertices = new HashSet<string> { startId };
        var visitedEdges = new HashSet<string>(); // edge ID for cycle=true mode

        void Dfs()
        {
            // Early exit if we've already collected enough paths for this (from, to) pair
            if ((long)results.Count >= MaxPaths)
                return;

            var currentId = pathNodes[^1];

            // Check if we reached the target (path length >= 1 edge)
            if (currentId == endId && pathEdges.Count > 0)
            {
                // Check via constraint on intermediate nodes (not from/to)
                if (CheckViaConstraint(pathNodes, viaSet, viaMode))
                {
                    var pathRef = BuildPathRef(pathNodes, pathEdges, elementById);
                    results.Add(pathRef);
                }
                // For self-loops (startId == endId), don't return here - continue exploring
                // unless we've reached maxDepth
                if (pathEdges.Count >= maxDepth)
                    return;
            }

            // Don't exceed maxDepth
            if (pathEdges.Count >= maxDepth)
                return;

            if (!adjacency.TryGetValue(currentId, out var neighbors))
                return;

            foreach (var (targetId, rel) in neighbors)
            {
                if (allowCycles)
                {
                    // Unique edges mode: same edge can't be traversed twice
                    if (!visitedEdges.Add(rel.Id))
                        continue;

                    pathNodes.Add(targetId);
                    pathEdges.Add(rel);

                    Dfs();

                    pathNodes.RemoveAt(pathNodes.Count - 1);
                    pathEdges.RemoveAt(pathEdges.Count - 1);
                    visitedEdges.Remove(rel.Id);
                }
                else
                {
                    // Unique vertices mode: no repeated vertices
                    // Exception: endId can be revisited if it's the target
                    if (targetId == endId)
                    {
                        // Allow reaching the destination
                        pathNodes.Add(targetId);
                        pathEdges.Add(rel);

                        if (CheckViaConstraint(pathNodes, viaSet, viaMode))
                        {
                            results.Add(BuildPathRef(pathNodes, pathEdges, elementById));
                        }

                        pathNodes.RemoveAt(pathNodes.Count - 1);
                        pathEdges.RemoveAt(pathEdges.Count - 1);
                    }
                    else if (visitedVertices.Add(targetId))
                    {
                        pathNodes.Add(targetId);
                        pathEdges.Add(rel);

                        Dfs();

                        pathNodes.RemoveAt(pathNodes.Count - 1);
                        pathEdges.RemoveAt(pathEdges.Count - 1);
                        visitedVertices.Remove(targetId);
                    }
                }
            }
        }

        Dfs();
        return results;
    }

    private static bool CheckViaConstraint(
        List<string> pathNodes,
        HashSet<string>? viaSet,
        ViaMode viaMode)
    {
        if (viaSet is null)
            return true;

        // Via applies only to intermediate nodes (not first and last)
        if (pathNodes.Count <= 2)
            return true; // No intermediate nodes

        var intermediateNodes = pathNodes.Skip(1).Take(pathNodes.Count - 2);

        return viaMode switch
        {
            ViaMode.Include => intermediateNodes.All(n => viaSet.Contains(n)),
            ViaMode.Exclude => intermediateNodes.All(n => !viaSet.Contains(n)),
            _ => true
        };
    }

    private static PathRef BuildPathRef(
        List<string> pathNodes,
        List<RelationshipRef> pathEdges,
        Dictionary<string, ElementRef> elementById)
    {
        var nodes = pathNodes.Select(id => elementById[id]).ToList();
        var edges = pathEdges.ToList();

        return new PathRef
        {
            Nodes = nodes,
            Edges = edges,
            Length = edges.Count,
            From = nodes[0],
            To = nodes[^1]
        };
    }

    private static IReadOnlyList<ElementRef> FilterBySourceFamilies(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies)
    {
        if (ruleSourceFamilies is not { Count: > 0 })
            return elements;

        var familyStrings = ruleSourceFamilies.Select(f => f.ToString().ToLowerInvariant()).ToHashSet();
        return elements.Where(e => familyStrings.Contains(e.SourceFamily.ToLowerInvariant())).ToList();
    }

    private static IReadOnlyList<RelationshipRef> FilterRelationshipsBySourceFamilies(
        IReadOnlyList<RelationshipRef> relationships,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies)
    {
        if (ruleSourceFamilies is not { Count: > 0 })
            return relationships;

        var familyStrings = ruleSourceFamilies.Select(f => f.ToString().ToLowerInvariant()).ToHashSet();
        return relationships.Where(r => familyStrings.Contains(r.SourceFamily.ToLowerInvariant())).ToList();
    }
}
