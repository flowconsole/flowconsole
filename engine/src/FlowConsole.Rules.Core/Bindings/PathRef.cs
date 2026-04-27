namespace FlowConsole.Rules.Core.Bindings;

/// <summary>
/// A path in the graph found for a flow rule.
/// Equality is not supported (RF_EXPR_UNSUPPORTED_CONSTRUCT).
/// </summary>
public sealed record PathRef
{
    public required IReadOnlyList<ElementRef> Nodes { get; init; }
    public required IReadOnlyList<RelationshipRef> Edges { get; init; }
    public required int Length { get; init; }
    public required ElementRef From { get; init; }
    public required ElementRef To { get; init; }
}
