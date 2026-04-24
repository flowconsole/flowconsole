using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Bindings;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Registry of all helper functions defined in helpers.md.
/// Used for compile-time validation and reserved name checking.
/// </summary>
internal sealed class HelperRegistry : IHelperCatalog
{
    private static readonly Dictionary<string, List<HelperSignature>> Helpers = BuildHelpers();
    private static readonly HashSet<string> Reserved = BuildReservedNames();

    public bool IsKnownHelper(string name) => Helpers.ContainsKey(name);

    public IReadOnlyList<HelperSignature> GetSignatures(string name)
        => Helpers.TryGetValue(name, out var sigs) ? sigs : [];

    public IReadOnlySet<string> GetReservedNames() => Reserved;

    private static Dictionary<string, List<HelperSignature>> BuildHelpers()
    {
        var h = new Dictionary<string, List<HelperSignature>>();

        void Add(string name, HelperSignature sig)
        {
            if (!h.TryGetValue(name, out var list))
            {
                list = [];
                h[name] = list;
            }
            list.Add(sig);
        }

        // count(list<T>) -> int
        Add("count", new HelperSignature("count",
            [new HelperParameter("value", typeof(IReadOnlyList<object>))],
            typeof(int)));

        // count(list<T>, predicate: T -> bool) -> int
        Add("count", new HelperSignature("count",
            [new HelperParameter("value", typeof(IReadOnlyList<object>)),
             new HelperParameter("predicate", typeof(Func<object, bool>), IsLambda: true)],
            typeof(int)));

        // distinct(list<T>) -> list<T>
        Add("distinct", new HelperSignature("distinct",
            [new HelperParameter("value", typeof(IReadOnlyList<object>))],
            typeof(IReadOnlyList<object>)));

        // distinct(list<T>, keyExpr: T -> K) -> list<T>
        Add("distinct", new HelperSignature("distinct",
            [new HelperParameter("value", typeof(IReadOnlyList<object>)),
             new HelperParameter("keyExpr", typeof(Func<object, object>), IsLambda: true)],
            typeof(IReadOnlyList<object>)));

        // exists(list<T>, predicate: T -> bool) -> bool
        Add("exists", new HelperSignature("exists",
            [new HelperParameter("value", typeof(IReadOnlyList<object>)),
             new HelperParameter("predicate", typeof(Func<object, bool>), IsLambda: true)],
            typeof(bool)));

        // all(list<T>, predicate: T -> bool) -> bool
        Add("all", new HelperSignature("all",
            [new HelperParameter("value", typeof(IReadOnlyList<object>)),
             new HelperParameter("predicate", typeof(Func<object, bool>), IsLambda: true)],
            typeof(bool)));

        // any(list<T>, predicate: T -> bool) -> bool — alias for exists
        Add("any", new HelperSignature("any",
            [new HelperParameter("value", typeof(IReadOnlyList<object>)),
             new HelperParameter("predicate", typeof(Func<object, bool>), IsLambda: true)],
            typeof(bool)));

        // none(list<T>, predicate: T -> bool) -> bool
        Add("none", new HelperSignature("none",
            [new HelperParameter("value", typeof(IReadOnlyList<object>)),
             new HelperParameter("predicate", typeof(Func<object, bool>), IsLambda: true)],
            typeof(bool)));

        // neighbors(item: ElementRef) -> list<ElementRef>
        Add("neighbors", new HelperSignature("neighbors",
            [new HelperParameter("item", typeof(ElementRef))],
            typeof(IReadOnlyList<ElementRef>)));

        // neighbors(item: ElementRef, relKind: string) -> list<ElementRef>
        Add("neighbors", new HelperSignature("neighbors",
            [new HelperParameter("item", typeof(ElementRef)),
             new HelperParameter("relKind", typeof(string))],
            typeof(IReadOnlyList<ElementRef>)));

        // neighbors(item: ElementRef, direction: string, relKind: string) -> list<ElementRef>
        Add("neighbors", new HelperSignature("neighbors",
            [new HelperParameter("item", typeof(ElementRef)),
             new HelperParameter("direction", typeof(string)),
             new HelperParameter("relKind", typeof(string))],
            typeof(IReadOnlyList<ElementRef>)));

        // incoming(item: ElementRef) -> list<RelationshipRef>
        Add("incoming", new HelperSignature("incoming",
            [new HelperParameter("item", typeof(ElementRef))],
            typeof(IReadOnlyList<RelationshipRef>)));

        // incoming(item: ElementRef, relKind: string) -> list<RelationshipRef>
        Add("incoming", new HelperSignature("incoming",
            [new HelperParameter("item", typeof(ElementRef)),
             new HelperParameter("relKind", typeof(string))],
            typeof(IReadOnlyList<RelationshipRef>)));

        // outgoing(item: ElementRef) -> list<RelationshipRef>
        Add("outgoing", new HelperSignature("outgoing",
            [new HelperParameter("item", typeof(ElementRef))],
            typeof(IReadOnlyList<RelationshipRef>)));

        // outgoing(item: ElementRef, relKind: string) -> list<RelationshipRef>
        Add("outgoing", new HelperSignature("outgoing",
            [new HelperParameter("item", typeof(ElementRef)),
             new HelperParameter("relKind", typeof(string))],
            typeof(IReadOnlyList<RelationshipRef>)));

        // changed(item: DiffItem, field: string) -> bool
        Add("changed", new HelperSignature("changed",
            [new HelperParameter("item", typeof(DiffItem)),
             new HelperParameter("field", typeof(string))],
            typeof(bool)));

        // before(item: DiffItem, field: string) -> dyn
        Add("before", new HelperSignature("before",
            [new HelperParameter("item", typeof(DiffItem)),
             new HelperParameter("field", typeof(string))],
            typeof(object)));

        // after(item: DiffItem, field: string) -> dyn
        Add("after", new HelperSignature("after",
            [new HelperParameter("item", typeof(DiffItem)),
             new HelperParameter("field", typeof(string))],
            typeof(object)));

        // hasTag(item: ElementRef, tag: string) -> bool
        Add("hasTag", new HelperSignature("hasTag",
            [new HelperParameter("item", typeof(ElementRef)),
             new HelperParameter("tag", typeof(string))],
            typeof(bool)));

        // hasTag(item: RelationshipRef, tag: string) -> bool
        Add("hasTag", new HelperSignature("hasTag",
            [new HelperParameter("item", typeof(RelationshipRef)),
             new HelperParameter("tag", typeof(string))],
            typeof(bool)));

        // hasKind(item: ElementRef, kind: string) -> bool
        Add("hasKind", new HelperSignature("hasKind",
            [new HelperParameter("item", typeof(ElementRef)),
             new HelperParameter("kind", typeof(string))],
            typeof(bool)));

        // hasKind(item: RelationshipRef, kind: string) -> bool
        Add("hasKind", new HelperSignature("hasKind",
            [new HelperParameter("item", typeof(RelationshipRef)),
             new HelperParameter("kind", typeof(string))],
            typeof(bool)));

        return h;
    }

    private static HashSet<string> BuildReservedNames()
    {
        var names = new HashSet<string>(Helpers.Keys);
        // Binding names from helpers.md
        names.Add("item");
        names.Add("items");
        names.Add("rule");
        names.Add("stats");
        names.Add("diff");
        names.Add("path");
        names.Add("paths");
        names.Add("from");
        names.Add("to");
        return names;
    }
}
