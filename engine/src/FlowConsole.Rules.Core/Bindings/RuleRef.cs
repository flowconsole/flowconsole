namespace FlowConsole.Rules.Core.Bindings;

/// <summary>
/// Metadata of the currently executing rule, available as the 'rule' binding.
/// Corresponds to 'Rule' type in types.md.
/// </summary>
public sealed record RuleRef
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Severity { get; init; }
    public required string Kind { get; init; }
    public required string Target { get; init; }
}
