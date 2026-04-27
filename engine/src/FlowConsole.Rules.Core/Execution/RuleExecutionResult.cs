namespace FlowConsole.Rules.Core.Execution;

/// <summary>
/// Result of executing a compiled rule file against a model.
/// </summary>
public sealed record RuleExecutionResult
{
    public required IReadOnlyList<Finding> Findings { get; init; }
    public required IReadOnlyList<RuleExecutionError> Errors { get; init; }
    public required DateTimeOffset ExecutedAt { get; init; }
    public required int RuleCount { get; init; }
    public required int PassedCount { get; init; }
    public required int FailedCount { get; init; }
}

/// <summary>
/// A single finding emitted when a rule assertion fails.
/// </summary>
public sealed record Finding
{
    public required string RuleId { get; init; }
    public required string RuleName { get; init; }
    public required string Severity { get; init; }
    public required bool Blocking { get; init; }
    public required string Message { get; init; }
    public IReadOnlyList<string> ElementIds { get; init; } = [];
}

/// <summary>
/// A runtime error encountered while executing a single rule.
/// The error does not stop other rules from executing.
/// </summary>
public sealed record RuleExecutionError(
    string RuleId,
    string Code,
    string Message);
