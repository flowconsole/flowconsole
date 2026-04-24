using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Relations;

/// <summary>
/// Abstract base for the typed Relationship hierarchy.
/// Each concrete subtype maps to exactly one <see cref="RelationKind"/>.
/// </summary>
public abstract record RelationshipBase
{
    public RelationshipId Id { get; init; }
    public abstract RelationKind Kind { get; }
    public ElementId SourceId { get; init; }
    public ElementId TargetId { get; init; }
    public string? Label { get; init; }
    public string? Technology { get; init; }
    public ElementSource Source { get; init; }
    public IReadOnlyDictionary<string, string> Properties { get; init; } = new Dictionary<string, string>();
}
