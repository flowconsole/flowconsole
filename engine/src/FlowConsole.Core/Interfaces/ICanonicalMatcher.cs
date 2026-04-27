using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Core.Interfaces;

/// <summary>
/// Assigns canonical_id values to elements from different source layers,
/// linking them to a shared canonical identity for drift detection.
/// </summary>
public interface ICanonicalMatcher
{
    /// <summary>
    /// Matches elements without canonical_id against existing canonical elements.
    /// Returns a mapping of ElementId → canonical_id for all newly matched elements.
    /// </summary>
    Task<IReadOnlyDictionary<ElementId, string>> MatchAsync(
        ModelId modelId, string source, CancellationToken ct);
}

