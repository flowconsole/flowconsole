using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Core.Abstractions;

/// <summary>
/// Builds the binding context (name-to-value map) for evaluating rule expressions.
/// The available bindings depend on the rule's (kind, target, mode) combination.
/// </summary>
public interface IBindingContextBuilder
{
    /// <summary>
    /// Builds bindings for an element perItem evaluation.
    /// </summary>
    Dictionary<string, object?> BuildElementPerItem(
        object item,
        RuleRef rule,
        DriftDiff? driftDiff = null,
        Stats? stats = null);

    /// <summary>
    /// Builds bindings for an element aggregate evaluation.
    /// </summary>
    Dictionary<string, object?> BuildElementAggregate(
        IReadOnlyList<object> items,
        Stats stats,
        RuleRef rule,
        DriftDiff? driftDiff = null);

    /// <summary>
    /// Builds bindings for a flow perPath evaluation.
    /// </summary>
    Dictionary<string, object?> BuildFlowPerPath(
        PathRef path,
        IReadOnlyList<PathRef> allPaths,
        ElementRef from,
        ElementRef to,
        Stats stats,
        RuleRef rule);

    /// <summary>
    /// Builds bindings for a flow aggregate evaluation.
    /// </summary>
    Dictionary<string, object?> BuildFlowAggregate(
        IReadOnlyList<PathRef> paths,
        ElementRef from,
        ElementRef to,
        Stats stats,
        RuleRef rule);
}
