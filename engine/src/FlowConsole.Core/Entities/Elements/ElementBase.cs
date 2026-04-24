using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities.Elements;

/// <summary>
/// Abstract base for the typed Element hierarchy.
/// Each concrete subtype maps to exactly one <see cref="ElementKind"/>.
/// </summary>
public abstract record ElementBase
{
    public ElementId Id { get; init; }
    public abstract ElementKind Kind { get; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Technology { get; init; }
    public ElementId? ParentId { get; init; }
    public ElementSource Source { get; init; }
    public string? CanonicalId { get; init; }
    public IReadOnlyList<string>? Aliases { get; init; }
    public IReadOnlyDictionary<string, string> Properties { get; init; } = new Dictionary<string, string>();
    public IReadOnlyList<Tag> Tags { get; init; } = [];
    public ElementLayer Layer => Kind.GetLayer();
}
