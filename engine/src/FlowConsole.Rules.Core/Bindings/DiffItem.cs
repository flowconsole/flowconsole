namespace FlowConsole.Rules.Core.Bindings;

/// <summary>
/// An element diff between model and actual projections.
/// Equality by canonicalId.
/// </summary>
public sealed record DiffItem
{
    public required string ChangeKind { get; init; }
    public required string CanonicalId { get; init; }
    public ElementRef? Model { get; init; }
    public ElementRef? Actual { get; init; }
    public IReadOnlyDictionary<string, FieldChange>? FieldChanges { get; init; }

    public bool Equals(DiffItem? other) => other is not null && CanonicalId == other.CanonicalId;
    public override int GetHashCode() => CanonicalId.GetHashCode();
}

/// <summary>
/// Description of a single field change between model and actual.
/// </summary>
public sealed record FieldChange(
    object? Before,
    object? After);
