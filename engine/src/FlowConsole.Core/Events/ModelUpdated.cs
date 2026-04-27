using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Events;

/// <summary>
/// Raised when a model's graph content is updated (rebuild, canonical mapping change, etc.).
/// The graph is read-only — no granular Element/Relationship events exist.
/// </summary>
public sealed record ModelUpdated(ModelId ModelId, string Source, DateTimeOffset OccurredAt);
