using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Core.Compiled;

/// <summary>
/// A single compiled rule ready for execution. All expressions are compiled,
/// defaults are filled, canonical key is assigned.
/// </summary>
public sealed record FlowConsoleRule
{
    public required string CanonicalKey { get; init; }
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required RuleKind Kind { get; init; }
    public required RuleTarget Target { get; init; }
    public required Severity Severity { get; init; }
    public required bool Blocking { get; init; }
    public required bool Enabled { get; init; }

    public string? Description { get; init; }
    public IReadOnlyList<string>? Tags { get; init; }
    public IReadOnlyList<SourceFamily>? SourceFamilies { get; init; }

    // Compiled expressions
    public required FlowConsoleExpression Assert { get; init; }
    public required FlowConsoleExpression Message { get; init; }
    public FlowConsoleExpression? Where { get; init; }
    public IReadOnlyDictionary<string, FlowConsoleExpression>? Let { get; init; }

    // Element-specific (compiled)
    public CompiledSelector? Subject { get; init; }
    public ElementMode? Mode { get; init; }
    public IReadOnlyList<ChangeKind>? ChangeKinds { get; init; }

    // Flow-specific (compiled)
    public CompiledSelector? From { get; init; }
    public CompiledSelector? To { get; init; }
    public CompiledSelector? Via { get; init; }
    public ViaMode? ViaMode { get; init; }
    public FlowMode? FlowMode { get; init; }
    public int? MaxDepth { get; init; }
    public bool? AllowCycles { get; init; }
}

/// <summary>
/// A compiled selector with optional compiled where expression.
/// </summary>
public sealed record CompiledSelector
{
    public required EntityType Entity { get; init; }
    public IReadOnlyList<string>? Kinds { get; init; }
    public IReadOnlyList<string>? TagsAny { get; init; }
    public IReadOnlyList<string>? TagsAll { get; init; }
    public TextMatcher? Name { get; init; }
    public TextMatcher? Technology { get; init; }
    public IReadOnlyList<SourceFamily>? SourceFamilies { get; init; }
    public IReadOnlyDictionary<string, PropertyMatcher>? Properties { get; init; }
    public FlowConsoleExpression? Where { get; init; }
}
