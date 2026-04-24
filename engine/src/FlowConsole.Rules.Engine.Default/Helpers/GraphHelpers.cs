using FlowConsole.Rules.Core.Bindings;

namespace FlowConsole.Rules.Engine.Default.Helpers;

/// <summary>
/// Pure C# implementations of graph navigation helpers defined in helpers.md.
/// neighbors, incoming, outgoing.
/// All operate on ElementRef; not defined for RelationshipRef.
/// </summary>
internal static class GraphHelpers
{
    /// <summary>
    /// incoming(item) -> list of RelationshipRef where targetId == item.Id
    /// </summary>
    public static List<RelationshipRef> Incoming(
        ElementRef item,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var result = new List<RelationshipRef>();
        foreach (var r in relationships)
        {
            if (r.TargetId == item.Id)
                result.Add(r);
        }
        return result;
    }

    /// <summary>
    /// incoming(item, relKind) -> filtered by RelationshipRef.kind
    /// </summary>
    public static List<RelationshipRef> Incoming(
        ElementRef item,
        string relKind,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var result = new List<RelationshipRef>();
        foreach (var r in relationships)
        {
            if (r.TargetId == item.Id && r.Kind == relKind)
                result.Add(r);
        }
        return result;
    }

    /// <summary>
    /// outgoing(item) -> list of RelationshipRef where sourceId == item.Id
    /// </summary>
    public static List<RelationshipRef> Outgoing(
        ElementRef item,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var result = new List<RelationshipRef>();
        foreach (var r in relationships)
        {
            if (r.SourceId == item.Id)
                result.Add(r);
        }
        return result;
    }

    /// <summary>
    /// outgoing(item, relKind) -> filtered by RelationshipRef.kind
    /// </summary>
    public static List<RelationshipRef> Outgoing(
        ElementRef item,
        string relKind,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var result = new List<RelationshipRef>();
        foreach (var r in relationships)
        {
            if (r.SourceId == item.Id && r.Kind == relKind)
                result.Add(r);
        }
        return result;
    }

    /// <summary>
    /// neighbors(item) -> list of ElementRef connected through any relationship (direction=any).
    /// Duplicates possible if connected through multiple edges.
    /// </summary>
    public static List<ElementRef> Neighbors(
        ElementRef item,
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        return NeighborsCore(item, "any", null, elements, relationships);
    }

    /// <summary>
    /// neighbors(item, relKind) -> filtered by relKind, direction=any
    /// </summary>
    public static List<ElementRef> Neighbors(
        ElementRef item,
        string relKind,
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        return NeighborsCore(item, "any", relKind, elements, relationships);
    }

    /// <summary>
    /// neighbors(item, direction, relKind) -> direction is "in", "out", or "any"
    /// </summary>
    public static List<ElementRef> Neighbors(
        ElementRef item,
        string direction,
        string relKind,
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        return NeighborsCore(item, direction, relKind, elements, relationships);
    }

    /// <summary>
    /// Overload accepting a pre-built element lookup to avoid O(N) dict rebuild per call.
    /// </summary>
    public static List<ElementRef> Neighbors(
        ElementRef item,
        IReadOnlyDictionary<string, ElementRef> elementById,
        IReadOnlyList<RelationshipRef> relationships)
    {
        return NeighborsCore(item, "any", null, elementById, relationships);
    }

    public static List<ElementRef> Neighbors(
        ElementRef item,
        string relKind,
        IReadOnlyDictionary<string, ElementRef> elementById,
        IReadOnlyList<RelationshipRef> relationships)
    {
        return NeighborsCore(item, "any", relKind, elementById, relationships);
    }

    public static List<ElementRef> Neighbors(
        ElementRef item,
        string direction,
        string relKind,
        IReadOnlyDictionary<string, ElementRef> elementById,
        IReadOnlyList<RelationshipRef> relationships)
    {
        return NeighborsCore(item, direction, relKind, elementById, relationships);
    }

    private static List<ElementRef> NeighborsCore(
        ElementRef item,
        string direction,
        string? relKind,
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var elementById = new Dictionary<string, ElementRef>();
        foreach (var e in elements)
            elementById.TryAdd(e.Id, e);

        return NeighborsCore(item, direction, relKind, elementById, relationships);
    }

    private static List<ElementRef> NeighborsCore(
        ElementRef item,
        string direction,
        string? relKind,
        IReadOnlyDictionary<string, ElementRef> elementById,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var result = new List<ElementRef>();

        foreach (var r in relationships)
        {
            if (relKind != null && r.Kind != relKind)
                continue;

            // Incoming: r.targetId == item.id -> neighbor is r.sourceId
            if (direction is "in" or "any" && r.TargetId == item.Id)
            {
                if (elementById.TryGetValue(r.SourceId, out var neighbor))
                    result.Add(neighbor);
            }

            // Outgoing: r.sourceId == item.id -> neighbor is r.targetId
            if (direction is "out" or "any" && r.SourceId == item.Id)
            {
                if (elementById.TryGetValue(r.TargetId, out var neighbor))
                    result.Add(neighbor);
            }
        }

        return result;
    }
}
