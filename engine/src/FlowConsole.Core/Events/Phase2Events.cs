using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Events;

/// <summary>Raised when an IR document is loaded into a model via the upload pipeline.</summary>
public sealed record IRLoaded(
    ModelId ModelId,
    string Source,
    int ElementCount,
    int RelationshipCount,
    DateTimeOffset OccurredAt);

/// <summary>Raised when the model graph is rebuilt (elements for a source replaced).</summary>
public sealed record GraphRebuilt(
    ModelId ModelId,
    string Source,
    DateTimeOffset OccurredAt);

/// <summary>Raised when a scan job transitions to the running state.</summary>
public sealed record ScanStarted(
    ModelId ModelId,
    ScanId ScanId,
    ElementSource ScanType,
    DateTimeOffset OccurredAt);

/// <summary>Raised when a scan job completes successfully.</summary>
public sealed record ScanCompleted(
    ModelId ModelId,
    ScanId ScanId,
    ElementSource ScanType,
    DateTimeOffset OccurredAt);

/// <summary>Raised when a scan job fails.</summary>
public sealed record ScanFailed(
    ModelId ModelId,
    ScanId ScanId,
    ElementSource ScanType,
    string Error,
    DateTimeOffset OccurredAt);
