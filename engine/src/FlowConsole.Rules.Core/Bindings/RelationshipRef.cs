namespace FlowConsole.Rules.Core.Bindings;

/// <summary>
/// Representation of a relationship between elements, exposed as binding in rule expressions.
/// Equality by id.
/// </summary>
public sealed record RelationshipRef
{
    public required string Id { get; init; }
    public required string Kind { get; init; }
    public required string SourceId { get; init; }
    public required string TargetId { get; init; }
    public string? Technology { get; init; }
    public IReadOnlyList<string> Tags { get; init; } = [];
    public IReadOnlyDictionary<string, object?> Properties { get; init; } =
        new Dictionary<string, object?>();
    public required string Source { get; init; }
    public required string SourceFamily { get; init; }

    public bool Equals(RelationshipRef? other) => other is not null && Id == other.Id;
    public override int GetHashCode() => Id.GetHashCode();
}
