using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.ValueObjects;
using QuikGraph;

namespace FlowConsole.Graph.Cache;

public sealed class GraphSnapshot
{
    public BidirectionalGraph<ElementId, SEdge<ElementId>> Graph { get; }
    public IReadOnlyDictionary<ElementId, ElementBase> Elements { get; }
    public IReadOnlyList<RelationshipBase> Relationships { get; }

    public GraphSnapshot(
        BidirectionalGraph<ElementId, SEdge<ElementId>> graph,
        IReadOnlyDictionary<ElementId, ElementBase> elements,
        IReadOnlyList<RelationshipBase> relationships)
    {
        Graph = graph;
        Elements = elements;
        Relationships = relationships;
    }

    public static GraphSnapshot Build(IReadOnlyList<ElementBase> elements, IReadOnlyList<RelationshipBase> relationships)
    {
        var graph = new BidirectionalGraph<ElementId, SEdge<ElementId>>(allowParallelEdges: true);
        var elementLookup = new Dictionary<ElementId, ElementBase>();

        foreach (var element in elements)
        {
            elementLookup[element.Id] = element;
            graph.AddVertex(element.Id);
        }

        foreach (var rel in relationships)
        {
            if (graph.ContainsVertex(rel.SourceId) && graph.ContainsVertex(rel.TargetId))
            {
                graph.AddEdge(new SEdge<ElementId>(rel.SourceId, rel.TargetId));
            }
        }

        return new GraphSnapshot(graph, elementLookup, relationships);
    }
}
