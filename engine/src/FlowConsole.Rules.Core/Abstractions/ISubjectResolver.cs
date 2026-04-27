using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Execution;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Core.Abstractions;

/// <summary>
/// Resolves a compiled selector to a list of matching entities for a given model and target.
/// Applies source family filters from both rule-level and selector-level.
/// </summary>
public interface ISubjectResolver
{
    /// <summary>
    /// Resolves the subject set for an element rule.
    /// </summary>
    /// <param name="selector">Compiled selector with entity type, kinds, tags, etc.</param>
    /// <param name="target">Which projection to query (model, actual, diff).</param>
    /// <param name="ruleSourceFamilies">Top-level rule sourceFamilies (AND-combined with selector's).</param>
    /// <param name="changeKinds">Change kinds filter for diff target.</param>
    /// <returns>
    /// On success: resolved subject set. On failure: error (e.g. RE_SUBJECT_TOO_LARGE, RE_DIFF_SNAPSHOT_MISSING).
    /// </returns>
    SubjectResolutionResult Resolve(
        CompiledSelector selector,
        RuleTarget target,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies,
        IReadOnlyList<ChangeKind>? changeKinds);
}

/// <summary>
/// Result of resolving a subject. Exactly one of the entity lists or Error is meaningful.
/// </summary>
public sealed record SubjectResolutionResult
{
    public IReadOnlyList<ElementRef> Elements { get; init; } = [];
    public IReadOnlyList<RelationshipRef> Relationships { get; init; } = [];
    public IReadOnlyList<DiffItem> DiffItems { get; init; } = [];
    public DriftDiff? DriftDiff { get; init; }
    public RuleExecutionError? Error { get; init; }

    public bool IsSuccess => Error is null;
}
