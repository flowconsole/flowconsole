using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

public sealed record ValidationRun
{
    public ValidationRunId Id { get; init; }
    public ModelId ModelId { get; init; }
    public string? Source { get; init; }
    public string? CommitSha { get; init; }
    public string? Branch { get; init; }
    public string? PipelineUrl { get; init; }
    public decimal? DriftScore { get; init; }
    public DateTimeOffset? ExecutedAt { get; init; }
    public int TotalRules { get; init; }
    public int PassedRules { get; init; }
    public int FailedRules { get; init; }
    public DateTimeOffset StartedAt { get; init; }
    public DateTimeOffset? CompletedAt { get; init; }
    public IReadOnlyList<ValidationResult> Results { get; init; } = [];
}

public sealed record ValidationResult
{
    public ValidationResultId Id { get; init; }
    public ValidationRunId RunId { get; init; }
    public ModelId ModelId { get; init; }
    public string? RuleId { get; init; }
    public string RuleName { get; init; } = string.Empty;
    public string Severity { get; init; } = "warning";
    public bool Blocking { get; init; }
    public string Message { get; init; } = string.Empty;
    public IReadOnlyList<string> ElementIds { get; init; } = [];
    public bool Resolved { get; init; }
    public DateTimeOffset DetectedAt { get; init; }
}
