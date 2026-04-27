using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Execution;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// In-memory subject resolver. Works with pre-loaded collections of elements, relationships,
/// and optionally a DriftDiff for diff target. Used for unit tests, conformance tests, and CLI.
/// </summary>
public sealed class InMemorySubjectResolver : ISubjectResolver
{
    public const int MaxSubjectSize = 50_000;

    private readonly IReadOnlyList<ElementRef> _elements;
    private readonly IReadOnlyList<RelationshipRef> _relationships;
    private readonly DriftDiff? _driftDiff;
    private readonly SelectorMatcher _matcher;

    public InMemorySubjectResolver(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships,
        DriftDiff? driftDiff = null,
        IExpressionEvaluator? evaluator = null)
    {
        _elements = elements;
        _relationships = relationships;
        _driftDiff = driftDiff;
        _matcher = new SelectorMatcher(evaluator);
    }

    public SubjectResolutionResult Resolve(
        CompiledSelector selector,
        RuleTarget target,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies,
        IReadOnlyList<ChangeKind>? changeKinds)
    {
        return target switch
        {
            RuleTarget.Model => ResolveModel(selector, ruleSourceFamilies),
            RuleTarget.Actual => ResolveActual(selector, ruleSourceFamilies),
            RuleTarget.Diff => ResolveDiff(selector, ruleSourceFamilies, changeKinds),
            _ => new SubjectResolutionResult
            {
                Error = new RuleExecutionError("", DiagnosticCodes.RE_SUBJECT_TOO_LARGE, $"Unknown target: {target}")
            }
        };
    }

    private SubjectResolutionResult ResolveModel(
        CompiledSelector selector,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies)
    {
        // Model projection = DSL files (sourceFamily = git)
        var filtered = FilterBySourceFamilies(
            _elements,
            _relationships,
            ruleSourceFamilies,
            defaultFamilies: [SourceFamily.Git]);

        return ResolveFromFiltered(selector, filtered.elements, filtered.relationships, null, null);
    }

    private SubjectResolutionResult ResolveActual(
        CompiledSelector selector,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies)
    {
        // Actual projection = code, infra, import sources
        var defaultActualFamilies = new[] { SourceFamily.Code, SourceFamily.Infra, SourceFamily.Import };
        var filtered = FilterBySourceFamilies(
            _elements,
            _relationships,
            ruleSourceFamilies,
            defaultFamilies: defaultActualFamilies);

        return ResolveFromFiltered(selector, filtered.elements, filtered.relationships, null, null);
    }

    private SubjectResolutionResult ResolveDiff(
        CompiledSelector selector,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies,
        IReadOnlyList<ChangeKind>? changeKinds)
    {
        if (_driftDiff is null)
        {
            return new SubjectResolutionResult
            {
                Error = new RuleExecutionError("", DiagnosticCodes.RE_DIFF_SNAPSHOT_MISSING,
                    "DriftDiff snapshot is required for diff target but was not provided")
            };
        }

        // Collect all DiffItems from the DriftDiff
        var allDiffItems = CollectDiffItems(_driftDiff, ruleSourceFamilies);

        var matched = _matcher.MatchDiffItems(selector, allDiffItems, changeKinds);

        if (matched.Count > MaxSubjectSize)
        {
            return new SubjectResolutionResult
            {
                Error = new RuleExecutionError("", DiagnosticCodes.RE_SUBJECT_TOO_LARGE,
                    $"Subject set size {matched.Count} exceeds maximum {MaxSubjectSize}")
            };
        }

        return new SubjectResolutionResult
        {
            DiffItems = matched,
            DriftDiff = _driftDiff
        };
    }

    private SubjectResolutionResult ResolveFromFiltered(
        CompiledSelector selector,
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships,
        DriftDiff? driftDiff,
        IReadOnlyList<ChangeKind>? changeKinds)
    {
        switch (selector.Entity)
        {
            case EntityType.Elements:
                {
                    var matched = _matcher.MatchElements(selector, elements);
                    if (matched.Count > MaxSubjectSize)
                    {
                        return new SubjectResolutionResult
                        {
                            Error = new RuleExecutionError("", DiagnosticCodes.RE_SUBJECT_TOO_LARGE,
                                $"Subject set size {matched.Count} exceeds maximum {MaxSubjectSize}")
                        };
                    }
                    return new SubjectResolutionResult { Elements = matched, DriftDiff = driftDiff };
                }

            case EntityType.Relationships:
                {
                    var matched = _matcher.MatchRelationships(selector, relationships);
                    if (matched.Count > MaxSubjectSize)
                    {
                        return new SubjectResolutionResult
                        {
                            Error = new RuleExecutionError("", DiagnosticCodes.RE_SUBJECT_TOO_LARGE,
                                $"Subject set size {matched.Count} exceeds maximum {MaxSubjectSize}")
                        };
                    }
                    return new SubjectResolutionResult { Relationships = matched, DriftDiff = driftDiff };
                }

            case EntityType.DiffItems:
                {
                    // DiffItems entity type should only be used with diff target
                    // but if reached here, return empty
                    return new SubjectResolutionResult();
                }

            default:
                return new SubjectResolutionResult();
        }
    }

    private static (IReadOnlyList<ElementRef> elements, IReadOnlyList<RelationshipRef> relationships) FilterBySourceFamilies(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships,
        IReadOnlyList<SourceFamily>? ruleSourceFamilies,
        SourceFamily[] defaultFamilies)
    {
        var activeFamilies = ruleSourceFamilies is { Count: > 0 }
            ? ruleSourceFamilies
            : (IReadOnlyList<SourceFamily>)defaultFamilies;

        var familyStrings = activeFamilies.Select(f => f.ToString().ToLowerInvariant()).ToHashSet();

        var filteredElements = elements
            .Where(e => familyStrings.Contains(e.SourceFamily.ToLowerInvariant()))
            .ToList();

        var filteredRelationships = relationships
            .Where(r => familyStrings.Contains(r.SourceFamily.ToLowerInvariant()))
            .ToList();

        return (filteredElements, filteredRelationships);
    }

    private static List<DiffItem> CollectDiffItems(DriftDiff drift, IReadOnlyList<SourceFamily>? ruleSourceFamilies)
    {
        var items = new List<DiffItem>();

        // Added elements become DiffItems with changeKind=Added
        foreach (var el in drift.Added)
        {
            if (ruleSourceFamilies is { Count: > 0 } && !MatchesSourceFamily(el, ruleSourceFamilies))
                continue;
            items.Add(new DiffItem
            {
                ChangeKind = ChangeKind.Added.ToString(),
                CanonicalId = el.CanonicalId,
                Actual = el
            });
        }

        // Removed elements
        foreach (var el in drift.Removed)
        {
            if (ruleSourceFamilies is { Count: > 0 } && !MatchesSourceFamily(el, ruleSourceFamilies))
                continue;
            items.Add(new DiffItem
            {
                ChangeKind = ChangeKind.Removed.ToString(),
                CanonicalId = el.CanonicalId,
                Model = el
            });
        }

        // Changed elements (already DiffItems in DriftDiff)
        foreach (var di in drift.Changed)
        {
            if (ruleSourceFamilies is { Count: > 0 })
            {
                var observed = di.Actual ?? di.Model;
                if (observed is not null && !MatchesSourceFamily(observed, ruleSourceFamilies))
                    continue;
            }
            items.Add(di);
        }

        // UnmatchedModel
        foreach (var el in drift.UnmatchedModel)
        {
            if (ruleSourceFamilies is { Count: > 0 } && !MatchesSourceFamily(el, ruleSourceFamilies))
                continue;
            items.Add(new DiffItem
            {
                ChangeKind = ChangeKind.UnmatchedModel.ToString(),
                CanonicalId = el.CanonicalId,
                Model = el
            });
        }

        // UnmatchedActual
        foreach (var el in drift.UnmatchedActual)
        {
            if (ruleSourceFamilies is { Count: > 0 } && !MatchesSourceFamily(el, ruleSourceFamilies))
                continue;
            items.Add(new DiffItem
            {
                ChangeKind = ChangeKind.UnmatchedActual.ToString(),
                CanonicalId = el.CanonicalId,
                Actual = el
            });
        }

        return items;
    }

    private static bool MatchesSourceFamily(ElementRef el, IReadOnlyList<SourceFamily> families)
    {
        return families.Any(f =>
            string.Equals(el.SourceFamily, f.ToString(), StringComparison.OrdinalIgnoreCase));
    }
}
