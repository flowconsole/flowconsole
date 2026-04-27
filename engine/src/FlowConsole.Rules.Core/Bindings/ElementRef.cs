namespace FlowConsole.Rules.Core.Bindings;

/// <summary>
/// Representation of a graph element, exposed as binding in rule expressions.
/// Equality by id.
/// </summary>
public sealed record ElementRef
{
    public required string Id { get; init; }
    public required string CanonicalId { get; init; }
    public required string Kind { get; init; }
    public required string Name { get; init; }
    public string? Technology { get; init; }
    public IReadOnlyList<string> Tags { get; init; } = [];
    public IReadOnlyDictionary<string, object?> Properties { get; init; } =
        new Dictionary<string, object?>();
    public required string Source { get; init; }
    public required string SourceFamily { get; init; }
    public string? ParentId { get; init; }

    /// <summary>
    /// Sentinel instance used when no concrete element is available
    /// (e.g. flow aggregate with empty paths). All string fields are empty.
    /// </summary>
    public static readonly ElementRef Empty = new()
    {
        Id = "",
        CanonicalId = "",
        Kind = "",
        Name = "",
        Source = "",
        SourceFamily = ""
    };

    public bool Equals(ElementRef? other) => other is not null && Id == other.Id;
    public override int GetHashCode() => Id.GetHashCode();
}
