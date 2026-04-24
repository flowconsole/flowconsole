namespace FlowConsole.Rules.Core.Model;

/// <summary>
/// Parsed representation of a YAML/JSON rule file document.
/// </summary>
public sealed record RuleFile(
    string ApiVersion,
    string Kind,
    IReadOnlyList<Rule> Rules);

/// <summary>
/// A single rule within a RuleFile.
/// </summary>
public sealed record Rule
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required RuleKind Kind { get; init; }
    public required RuleTarget Target { get; init; }
    public required Severity Severity { get; init; }
    public required bool Blocking { get; init; }
    public required string Assert { get; init; }
    public required string Message { get; init; }

    public string? Description { get; init; }
    public bool? Enabled { get; init; }
    public IReadOnlyList<string>? Tags { get; init; }
    public IReadOnlyList<SourceFamily>? SourceFamilies { get; init; }
    public string? Where { get; init; }
    public IReadOnlyDictionary<string, string>? Let { get; init; }

    // Element-specific
    public Selector? Subject { get; init; }
    public ElementMode? Mode { get; init; }
    public IReadOnlyList<ChangeKind>? ChangeKinds { get; init; }

    // Flow-specific
    public Selector? From { get; init; }
    public Selector? To { get; init; }
    public Selector? Via { get; init; }
    public ViaMode? ViaMode { get; init; }
    public FlowMode? FlowMode { get; init; }
    public int? MaxDepth { get; init; }
    public bool? AllowCycles { get; init; }
}

/// <summary>
/// Selector that describes which entities a rule applies to.
/// </summary>
public sealed record Selector
{
    public required EntityType Entity { get; init; }
    public IReadOnlyList<string>? Kinds { get; init; }
    public IReadOnlyList<string>? TagsAny { get; init; }
    public IReadOnlyList<string>? TagsAll { get; init; }
    public TextMatcher? Name { get; init; }
    public TextMatcher? Technology { get; init; }
    public IReadOnlyList<SourceFamily>? SourceFamilies { get; init; }
    public IReadOnlyDictionary<string, PropertyMatcher>? Properties { get; init; }
    public string? Where { get; init; }
}

/// <summary>
/// Matcher for textual fields (name, technology).
/// </summary>
public sealed record TextMatcher
{
    public string? ExactEquals { get; init; }
    public string? Contains { get; init; }
    public string? Matches { get; init; }
}

/// <summary>
/// Matcher for a property value.
/// </summary>
public sealed record PropertyMatcher
{
    public string? ExactEquals { get; init; }
    public IReadOnlyList<string>? In { get; init; }
    public string? Matches { get; init; }
}
