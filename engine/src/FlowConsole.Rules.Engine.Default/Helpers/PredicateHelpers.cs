using FlowConsole.Rules.Core.Bindings;

namespace FlowConsole.Rules.Engine.Default.Helpers;

/// <summary>
/// Pure C# implementations of tag and kind predicate helpers defined in helpers.md.
/// hasTag, hasKind. Defined for both ElementRef and RelationshipRef.
/// </summary>
internal static class PredicateHelpers
{
    /// <summary>
    /// hasTag(item: ElementRef, tag: string) -> bool
    /// Exact match, case-sensitive.
    /// </summary>
    public static bool HasTag(ElementRef item, string tag)
    {
        return item.Tags.Contains(tag);
    }

    /// <summary>
    /// hasTag(item: RelationshipRef, tag: string) -> bool
    /// Exact match, case-sensitive.
    /// </summary>
    public static bool HasTag(RelationshipRef item, string tag)
    {
        return item.Tags.Contains(tag);
    }

    /// <summary>
    /// hasKind(item: ElementRef, kind: string) -> bool
    /// Exact match, case-sensitive.
    /// </summary>
    public static bool HasKind(ElementRef item, string kind)
    {
        return item.Kind == kind;
    }

    /// <summary>
    /// hasKind(item: RelationshipRef, kind: string) -> bool
    /// Exact match, case-sensitive.
    /// </summary>
    public static bool HasKind(RelationshipRef item, string kind)
    {
        return item.Kind == kind;
    }
}
