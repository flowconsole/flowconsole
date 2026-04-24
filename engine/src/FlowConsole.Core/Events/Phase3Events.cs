using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Events;

/// <summary>Raised when canonical matching completes for a model+source.
/// Drift detection subscribes to this event (Phase 2 cascade).</summary>
public sealed record CanonicalMatchCompleted(
    ModelId ModelId,
    string Source,
    int MappingsAssigned,
    DateTimeOffset OccurredAt,
    ScanId? ScanId = null);

/// <summary>Raised when drift is detected between to-be and as-is models.</summary>
public sealed record DriftDetected(
    ModelId ModelId,
    DriftSnapshotId SnapshotId,
    string? ScanSource,
    decimal DriftScore,
    DateTimeOffset OccurredAt);

/// <summary>Raised when a validation run completes with failures.</summary>
public sealed record ValidationFailed(
    ModelId ModelId,
    ValidationRunId RunId,
    int FailCount,
    DateTimeOffset OccurredAt);

/// <summary>Raised when a validation run completes with all rules passing.</summary>
public sealed record ValidationPassed(
    ModelId ModelId,
    ValidationRunId RunId,
    int PassCount,
    DateTimeOffset OccurredAt);

/// <summary>Raised when graph analytics metrics are (re)computed for a model.</summary>
public sealed record MetricsComputed(
    ModelId ModelId,
    int TotalElements,
    int TotalRelationships,
    DateTimeOffset OccurredAt);
