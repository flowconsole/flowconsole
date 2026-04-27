using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Entities;

/// <summary>
/// Immutable snapshot of a model's elements and relationships from a single source.
/// Replaces IntermediateRepresentation.
/// </summary>
public sealed record ModelSnapshot(
    ElementSource Source,
    IReadOnlyList<ElementBase> Elements,
    IReadOnlyList<RelationshipBase> Relationships,
    IReadOnlyList<Flow>? Flows = null);
