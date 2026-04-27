namespace FlowConsole.Rules.Core.Diagnostics;

/// <summary>
/// A diagnostic produced during rule file ingestion or execution.
/// </summary>
public sealed record Diagnostic
{
    public required string Code { get; init; }
    public required DiagnosticPhase Phase { get; init; }
    public required DiagnosticLevel Level { get; init; }
    public required string Path { get; init; }
    public SourceRange? SourceRange { get; init; }
    public required string Message { get; init; }
    public string? Hint { get; init; }
    public string? RuleId { get; init; }
}

/// <summary>
/// Phase of the ingest/execution pipeline that produced the diagnostic.
/// </summary>
public enum DiagnosticPhase
{
    Parse,
    Schema,
    Semantic,
    Expression,
    Normalize,
    Runtime
}

/// <summary>
/// Severity level of the diagnostic itself.
/// </summary>
public enum DiagnosticLevel
{
    Error,
    Warning
}

/// <summary>
/// Range in the source file where a diagnostic was found.
/// </summary>
public sealed record SourceRange(
    SourcePosition Start,
    SourcePosition? End = null);

/// <summary>
/// A position in a source file (1-based line/column, 0-based offset).
/// </summary>
public sealed record SourcePosition(
    int Line,
    int Column,
    int Offset);
