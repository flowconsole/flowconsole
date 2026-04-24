using System.Text.RegularExpressions;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Applies all selector filters to in-memory collections of elements, relationships, or diff items.
/// All filters combine via AND. Empty selector (only entity set) returns all entities of that type.
/// </summary>
internal sealed class SelectorMatcher
{
    private readonly IExpressionEvaluator? _evaluator;

    public SelectorMatcher(IExpressionEvaluator? evaluator = null)
    {
        _evaluator = evaluator;
    }

    public IReadOnlyList<ElementRef> MatchElements(
        CompiledSelector selector,
        IEnumerable<ElementRef> elements)
    {
        var result = elements.AsEnumerable();

        if (selector.Kinds is { Count: > 0 } kinds)
            result = result.Where(e => kinds.Contains(e.Kind, StringComparer.OrdinalIgnoreCase));

        if (selector.TagsAny is { Count: > 0 } tagsAny)
            result = result.Where(e => e.Tags.Any(t => tagsAny.Contains(t, StringComparer.OrdinalIgnoreCase)));

        if (selector.TagsAll is { Count: > 0 } tagsAll)
            result = result.Where(e => tagsAll.All(t => e.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)));

        if (selector.Name is { } nameMatcher)
            result = result.Where(e => MatchText(nameMatcher, e.Name));

        if (selector.Technology is { } techMatcher)
            result = result.Where(e => e.Technology is not null && MatchText(techMatcher, e.Technology));

        if (selector.SourceFamilies is { Count: > 0 } families)
        {
            var familyStrings = families.Select(f => f.ToString().ToLowerInvariant()).ToHashSet();
            result = result.Where(e => familyStrings.Contains(e.SourceFamily.ToLowerInvariant()));
        }

        if (selector.Properties is { Count: > 0 } props)
            result = result.Where(e => MatchProperties(props, e.Properties));

        var materialized = result.ToList();

        if (selector.Where?.Compiled is not null && _evaluator is not null)
            materialized = ApplyWhereFilter(selector.Where, materialized);

        return materialized;
    }

    public IReadOnlyList<RelationshipRef> MatchRelationships(
        CompiledSelector selector,
        IEnumerable<RelationshipRef> relationships)
    {
        var result = relationships.AsEnumerable();

        if (selector.Kinds is { Count: > 0 } kinds)
            result = result.Where(r => kinds.Contains(r.Kind, StringComparer.OrdinalIgnoreCase));

        if (selector.TagsAny is { Count: > 0 } tagsAny)
            result = result.Where(r => r.Tags.Any(t => tagsAny.Contains(t, StringComparer.OrdinalIgnoreCase)));

        if (selector.TagsAll is { Count: > 0 } tagsAll)
            result = result.Where(r => tagsAll.All(t => r.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)));

        if (selector.Technology is { } techMatcher)
            result = result.Where(r => r.Technology is not null && MatchText(techMatcher, r.Technology));

        if (selector.SourceFamilies is { Count: > 0 } families)
        {
            var familyStrings = families.Select(f => f.ToString().ToLowerInvariant()).ToHashSet();
            result = result.Where(r => familyStrings.Contains(r.SourceFamily.ToLowerInvariant()));
        }

        if (selector.Properties is { Count: > 0 } props)
            result = result.Where(r => MatchProperties(props, r.Properties));

        var materialized = result.ToList();

        if (selector.Where?.Compiled is not null && _evaluator is not null)
            materialized = ApplyWhereFilterRelationships(selector.Where, materialized);

        return materialized;
    }

    public IReadOnlyList<DiffItem> MatchDiffItems(
        CompiledSelector selector,
        IEnumerable<DiffItem> diffItems,
        IReadOnlyList<ChangeKind>? changeKinds)
    {
        var result = diffItems.AsEnumerable();

        // Filter by changeKinds
        if (changeKinds is { Count: > 0 })
        {
            var changeKindStrings = changeKinds.Select(ck => ck.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase);
            result = result.Where(d => changeKindStrings.Contains(d.ChangeKind));
        }

        // Apply selector filters to the "observed" side of the diff item
        if (selector.Kinds is { Count: > 0 } kinds)
            result = result.Where(d => GetObservedElement(d) is { } el && kinds.Contains(el.Kind, StringComparer.OrdinalIgnoreCase));

        if (selector.TagsAny is { Count: > 0 } tagsAny)
            result = result.Where(d => GetObservedElement(d) is { } el && el.Tags.Any(t => tagsAny.Contains(t, StringComparer.OrdinalIgnoreCase)));

        if (selector.TagsAll is { Count: > 0 } tagsAll)
            result = result.Where(d => GetObservedElement(d) is { } el && tagsAll.All(t => el.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)));

        if (selector.Name is { } nameMatcher)
            result = result.Where(d => GetObservedElement(d) is { } el && MatchText(nameMatcher, el.Name));

        if (selector.Technology is { } techMatcher)
            result = result.Where(d => GetObservedElement(d) is { } el && el.Technology is not null && MatchText(techMatcher, el.Technology));

        if (selector.SourceFamilies is { Count: > 0 } families)
        {
            var familyStrings = families.Select(f => f.ToString().ToLowerInvariant()).ToHashSet();
            result = result.Where(d => GetObservedElement(d) is { } el && familyStrings.Contains(el.SourceFamily.ToLowerInvariant()));
        }

        if (selector.Properties is { Count: > 0 } props)
            result = result.Where(d => GetObservedElement(d) is { } el && MatchProperties(props, el.Properties));

        var materialized = result.ToList();

        if (selector.Where?.Compiled is not null && _evaluator is not null)
            materialized = ApplyWhereFilterDiffItems(selector.Where, materialized);

        return materialized;
    }

    private static ElementRef? GetObservedElement(DiffItem d) => d.Actual ?? d.Model;

    private static bool MatchText(TextMatcher matcher, string value)
    {
        if (matcher.ExactEquals is { } eq)
            return string.Equals(value, eq, StringComparison.OrdinalIgnoreCase);

        if (matcher.Contains is { } contains)
            return value.Contains(contains, StringComparison.OrdinalIgnoreCase);

        if (matcher.Matches is { } pattern)
            return Regex.IsMatch(value, pattern, RegexOptions.None, TimeSpan.FromMilliseconds(100));

        return true;
    }

    private static bool MatchProperties(
        IReadOnlyDictionary<string, PropertyMatcher> matchers,
        IReadOnlyDictionary<string, object?> properties)
    {
        foreach (var (key, matcher) in matchers)
        {
            if (!properties.TryGetValue(key, out var value))
                return false;

            var strValue = value?.ToString() ?? "";

            if (matcher.ExactEquals is { } eq)
            {
                if (!string.Equals(strValue, eq, StringComparison.OrdinalIgnoreCase))
                    return false;
            }

            if (matcher.In is { Count: > 0 } inValues)
            {
                if (!inValues.Contains(strValue, StringComparer.OrdinalIgnoreCase))
                    return false;
            }

            if (matcher.Matches is { } pattern)
            {
                if (!Regex.IsMatch(strValue, pattern, RegexOptions.None, TimeSpan.FromMilliseconds(100)))
                    return false;
            }
        }

        return true;
    }

    private List<ElementRef> ApplyWhereFilter(FlowConsoleExpression where, List<ElementRef> items)
    {
        return items.Where(item =>
        {
            var bindings = new Dictionary<string, object?> { ["item"] = item };
            var result = _evaluator!.Evaluate(where.Compiled!, bindings);
            return result.IsSuccess && result.Value is true;
        }).ToList();
    }

    private List<RelationshipRef> ApplyWhereFilterRelationships(FlowConsoleExpression where, List<RelationshipRef> items)
    {
        return items.Where(item =>
        {
            var bindings = new Dictionary<string, object?> { ["item"] = item };
            var result = _evaluator!.Evaluate(where.Compiled!, bindings);
            return result.IsSuccess && result.Value is true;
        }).ToList();
    }

    private List<DiffItem> ApplyWhereFilterDiffItems(FlowConsoleExpression where, List<DiffItem> items)
    {
        return items.Where(item =>
        {
            var bindings = new Dictionary<string, object?> { ["item"] = item };
            var result = _evaluator!.Evaluate(where.Compiled!, bindings);
            return result.IsSuccess && result.Value is true;
        }).ToList();
    }
}
