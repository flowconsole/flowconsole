namespace FlowConsole.Core.Entities;

/// <summary>
/// Immutable domain record representing a named flow (sequence of steps) through the architecture.
/// Flows are model-level metadata stored as jsonb, not graph structure.
/// </summary>
public sealed record Flow(
    string Id,
    string Name,
    string? Description,
    IReadOnlyList<FlowStep> Steps);

/// <summary>
/// A single step within a flow. Array index determines order (no explicit Order field per E4).
/// </summary>
public sealed record FlowStep(
    string SourceElementId,
    string? RelationshipId,
    string? Label,
    IReadOnlyDictionary<string, string>? Properties);
