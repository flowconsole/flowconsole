using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Determines the typed set of bindings available for each (kind, target, mode) combination.
/// Strictly follows the table in expression-language.md.
/// </summary>
internal static class BindingTypeResolver
{
    /// <summary>
    /// Returns the available bindings for a selector.where context.
    /// </summary>
    public static Dictionary<string, Type> ForSelectorWhere(EntityType entity)
    {
        var itemType = entity switch
        {
            EntityType.Elements => typeof(ElementRef),
            EntityType.Relationships => typeof(RelationshipRef),
            EntityType.DiffItems => typeof(DiffItem),
            _ => typeof(object)
        };

        return new Dictionary<string, Type>
        {
            ["item"] = itemType
        };
    }

    /// <summary>
    /// Returns the available bindings for a rule expression context.
    /// </summary>
    public static Dictionary<string, Type> ForRule(
        RuleKind kind, RuleTarget target, EntityType entity,
        ElementMode? elementMode, FlowMode? flowMode)
    {
        return kind switch
        {
            RuleKind.Element => ForElement(target, entity, elementMode ?? ElementMode.PerItem),
            RuleKind.Flow => ForFlow(flowMode ?? FlowMode.Aggregate),
            _ => new Dictionary<string, Type>()
        };
    }

    private static Dictionary<string, Type> ForElement(RuleTarget target, EntityType entity, ElementMode mode)
    {
        if (target == RuleTarget.Diff)
        {
            return mode switch
            {
                ElementMode.PerItem => new Dictionary<string, Type>
                {
                    ["item"] = typeof(DiffItem),
                    ["diff"] = typeof(DriftDiff),
                    ["stats"] = typeof(Stats),
                    ["rule"] = typeof(RuleRef)
                },
                ElementMode.Aggregate => new Dictionary<string, Type>
                {
                    ["items"] = typeof(IReadOnlyList<DiffItem>),
                    ["diff"] = typeof(DriftDiff),
                    ["stats"] = typeof(Stats),
                    ["rule"] = typeof(RuleRef)
                },
                _ => new Dictionary<string, Type>()
            };
        }

        // model or actual
        var itemType = entity switch
        {
            EntityType.Elements => typeof(ElementRef),
            EntityType.Relationships => typeof(RelationshipRef),
            _ => typeof(ElementRef)
        };

        return mode switch
        {
            ElementMode.PerItem => new Dictionary<string, Type>
            {
                ["item"] = itemType,
                ["rule"] = typeof(RuleRef)
            },
            ElementMode.Aggregate => new Dictionary<string, Type>
            {
                ["items"] = typeof(IReadOnlyList<object>),
                ["stats"] = typeof(Stats),
                ["rule"] = typeof(RuleRef)
            },
            _ => new Dictionary<string, Type>()
        };
    }

    private static Dictionary<string, Type> ForFlow(FlowMode mode)
    {
        return mode switch
        {
            FlowMode.PerPath => new Dictionary<string, Type>
            {
                ["path"] = typeof(PathRef),
                ["paths"] = typeof(IReadOnlyList<PathRef>),
                ["from"] = typeof(ElementRef),
                ["to"] = typeof(ElementRef),
                ["stats"] = typeof(Stats),
                ["rule"] = typeof(RuleRef)
            },
            FlowMode.Aggregate => new Dictionary<string, Type>
            {
                ["paths"] = typeof(IReadOnlyList<PathRef>),
                ["from"] = typeof(ElementRef),
                ["to"] = typeof(ElementRef),
                ["stats"] = typeof(Stats),
                ["rule"] = typeof(RuleRef)
            },
            _ => new Dictionary<string, Type>()
        };
    }
}
