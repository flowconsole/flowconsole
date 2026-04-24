using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Bindings;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Builds the binding context (name-to-value map) for evaluating rule expressions.
/// Binding availability follows the table in expression-language.md.
/// </summary>
internal sealed class BindingContextBuilder : IBindingContextBuilder
{
    public Dictionary<string, object?> BuildElementPerItem(
        object item,
        RuleRef rule,
        DriftDiff? driftDiff = null,
        Stats? stats = null)
    {
        var ctx = new Dictionary<string, object?>
        {
            ["item"] = item,
            ["rule"] = rule
        };

        // diff perItem also gets diff and stats
        if (driftDiff is not null)
            ctx["diff"] = driftDiff;

        if (stats is not null)
            ctx["stats"] = stats;

        return ctx;
    }

    public Dictionary<string, object?> BuildElementAggregate(
        IReadOnlyList<object> items,
        Stats stats,
        RuleRef rule,
        DriftDiff? driftDiff = null)
    {
        var ctx = new Dictionary<string, object?>
        {
            ["items"] = items,
            ["stats"] = stats,
            ["rule"] = rule
        };

        if (driftDiff is not null)
            ctx["diff"] = driftDiff;

        return ctx;
    }

    public Dictionary<string, object?> BuildFlowPerPath(
        PathRef path,
        IReadOnlyList<PathRef> allPaths,
        ElementRef from,
        ElementRef to,
        Stats stats,
        RuleRef rule)
    {
        return new Dictionary<string, object?>
        {
            ["path"] = path,
            ["paths"] = allPaths,
            ["from"] = from,
            ["to"] = to,
            ["stats"] = stats,
            ["rule"] = rule
        };
    }

    public Dictionary<string, object?> BuildFlowAggregate(
        IReadOnlyList<PathRef> paths,
        ElementRef from,
        ElementRef to,
        Stats stats,
        RuleRef rule)
    {
        return new Dictionary<string, object?>
        {
            ["paths"] = paths,
            ["from"] = from,
            ["to"] = to,
            ["stats"] = stats,
            ["rule"] = rule
        };
    }
}
