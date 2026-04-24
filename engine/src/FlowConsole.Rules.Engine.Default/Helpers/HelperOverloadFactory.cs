using Cel.Common.Types;
using Cel.Common.Types.Pb;
using Cel.Common.Types.Ref;
using Cel.Common.Types.Traits;
using Cel.Interpreter.Functions;
using FlowConsole.Rules.Core.Bindings;
using CelOverload = Cel.Interpreter.Functions.Overload;

namespace FlowConsole.Rules.Engine.Default.Helpers;

/// <summary>
/// Creates Cel.NET Overload objects for all helper functions.
/// Cel.NET dispatches by argument count: 1-arg -> UnaryOp, 2-arg -> BinaryOp, 3+ -> FunctionOp.
/// We register each function name once using NewOverload with all three delegates,
/// routing internally by argument count and type.
/// </summary>
internal static class HelperOverloadFactory
{
    private static readonly TypeAdapter Adapter =
        DefaultTypeAdapter.Instance.ToTypeAdapter();

    public static CelOverload[] Create(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        return
        [
            MakeOverload("count", CountUnary, null, CountFn),
            MakeOverload("distinct", DistinctUnary, null, DistinctFn),

            MakeOverload("incoming", MakeIncomingUnary(relationships), MakeIncomingBinary(relationships), MakeIncomingFn(relationships)),
            MakeOverload("outgoing", MakeOutgoingUnary(relationships), MakeOutgoingBinary(relationships), MakeOutgoingFn(relationships)),
            MakeOverload("neighbors", MakeNeighborsUnary(elements, relationships), MakeNeighborsBinary(elements, relationships), MakeNeighborsFn(elements, relationships)),
            // Note: neighbor overloads pre-build element lookup dict (see Make* methods below)

            MakeOverload("changed", null, ChangedBinary, ChangedFn),
            MakeOverload("before", null, BeforeBinary, BeforeFn),
            MakeOverload("after", null, AfterBinary, AfterFn),

            MakeOverload("hasTag", null, HasTagBinary, HasTagFn),
            MakeOverload("hasKind", null, HasKindBinary, HasKindFn),

            // Lambda-based helpers (exists, all, any, none, count(list, predicate), distinct(list, key))
            // are not supported in v1alpha1. Lambda syntax (x -> expr) is rejected by ExpressionWhitelist,
            // and lambda-only function declarations are excluded from CelTypeAdapter.
        ];
    }

    public static CelOverload[] CreateMinimal()
    {
        return Create([], []);
    }

    private static CelOverload MakeOverload(string name, UnaryOp? unary, BinaryOp? binary, FunctionOp? function)
    {
        return CelOverload.NewOverload(name, Trait.None, unary, binary, function);
    }

    private static IVal CountUnary(IVal val)
    {
        var list = ExtractList(val);
        if (list is null) return Err.NewErr("count(null): null argument");
        return IntT.IntOf(CollectionHelpers.Count(list));
    }

    private static IVal CountFn(IVal[] args)
    {
        if (args.Length < 1) return Err.NewErr("count: requires at least 1 argument");
        return CountUnary(args[0]);
    }

    private static IVal DistinctUnary(IVal val)
    {
        var list = ExtractList(val);
        if (list is null) return Err.NewErr("distinct(null): null argument");
        return WrapList(CollectionHelpers.Distinct(list));
    }

    private static IVal DistinctFn(IVal[] args)
    {
        if (args.Length < 1) return Err.NewErr("distinct: requires at least 1 argument");
        return DistinctUnary(args[0]);
    }

    private static UnaryOp MakeIncomingUnary(IReadOnlyList<RelationshipRef> relationships)
    {
        return val =>
        {
            var element = ExtractElementRef(val);
            if (element is null) return WrapList(new List<object?>());
            return WrapList(GraphHelpers.Incoming(element, relationships).Cast<object?>().ToList());
        };
    }

    private static BinaryOp MakeIncomingBinary(IReadOnlyList<RelationshipRef> relationships)
    {
        return (lhs, rhs) =>
        {
            var element = ExtractElementRef(lhs);
            if (element is null) return WrapList(new List<object?>());
            var relKind = ExtractString(rhs);
            var result = relKind is not null
                ? GraphHelpers.Incoming(element, relKind, relationships)
                : GraphHelpers.Incoming(element, relationships);
            return WrapList(result.Cast<object?>().ToList());
        };
    }

    private static FunctionOp MakeIncomingFn(IReadOnlyList<RelationshipRef> relationships)
    {
        return args =>
        {
            if (args.Length < 1) return WrapList(new List<object?>());
            var element = ExtractElementRef(args[0]);
            if (element is null) return WrapList(new List<object?>());

            var result = args.Length >= 2 && ExtractString(args[1]) is { } relKind
                ? GraphHelpers.Incoming(element, relKind, relationships)
                : GraphHelpers.Incoming(element, relationships);

            return WrapList(result.Cast<object?>().ToList());
        };
    }

    private static UnaryOp MakeOutgoingUnary(IReadOnlyList<RelationshipRef> relationships)
    {
        return val =>
        {
            var element = ExtractElementRef(val);
            if (element is null) return WrapList(new List<object?>());
            return WrapList(GraphHelpers.Outgoing(element, relationships).Cast<object?>().ToList());
        };
    }

    private static BinaryOp MakeOutgoingBinary(IReadOnlyList<RelationshipRef> relationships)
    {
        return (lhs, rhs) =>
        {
            var element = ExtractElementRef(lhs);
            if (element is null) return WrapList(new List<object?>());
            var relKind = ExtractString(rhs);
            var result = relKind is not null
                ? GraphHelpers.Outgoing(element, relKind, relationships)
                : GraphHelpers.Outgoing(element, relationships);
            return WrapList(result.Cast<object?>().ToList());
        };
    }

    private static FunctionOp MakeOutgoingFn(IReadOnlyList<RelationshipRef> relationships)
    {
        return args =>
        {
            if (args.Length < 1) return WrapList(new List<object?>());
            var element = ExtractElementRef(args[0]);
            if (element is null) return WrapList(new List<object?>());

            var result = args.Length >= 2 && ExtractString(args[1]) is { } relKind
                ? GraphHelpers.Outgoing(element, relKind, relationships)
                : GraphHelpers.Outgoing(element, relationships);

            return WrapList(result.Cast<object?>().ToList());
        };
    }

    private static UnaryOp MakeNeighborsUnary(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var elementById = BuildElementLookup(elements);
        return val =>
        {
            var element = ExtractElementRef(val);
            if (element is null) return WrapList(new List<object?>());
            return WrapList(GraphHelpers.Neighbors(element, elementById, relationships).Cast<object?>().ToList());
        };
    }

    private static BinaryOp MakeNeighborsBinary(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var elementById = BuildElementLookup(elements);
        return (lhs, rhs) =>
        {
            var element = ExtractElementRef(lhs);
            if (element is null) return WrapList(new List<object?>());
            var relKind = ExtractString(rhs);
            var result = relKind is not null
                ? GraphHelpers.Neighbors(element, relKind, elementById, relationships)
                : GraphHelpers.Neighbors(element, elementById, relationships);
            return WrapList(result.Cast<object?>().ToList());
        };
    }

    private static FunctionOp MakeNeighborsFn(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        var elementById = BuildElementLookup(elements);
        return args =>
        {
            if (args.Length < 1) return WrapList(new List<object?>());
            var element = ExtractElementRef(args[0]);
            if (element is null) return WrapList(new List<object?>());

            List<ElementRef> result;
            if (args.Length >= 3 && ExtractString(args[1]) is { } direction && ExtractString(args[2]) is { } relKind3)
                result = GraphHelpers.Neighbors(element, direction, relKind3, elementById, relationships);
            else if (args.Length >= 2 && ExtractString(args[1]) is { } relKind2)
                result = GraphHelpers.Neighbors(element, relKind2, elementById, relationships);
            else
                result = GraphHelpers.Neighbors(element, elementById, relationships);

            return WrapList(result.Cast<object?>().ToList());
        };
    }

    private static Dictionary<string, ElementRef> BuildElementLookup(IReadOnlyList<ElementRef> elements)
    {
        var dict = new Dictionary<string, ElementRef>(elements.Count);
        foreach (var e in elements)
            dict.TryAdd(e.Id, e);
        return dict;
    }

    private static IVal ChangedBinary(IVal lhs, IVal rhs)
    {
        var item = ExtractDiffItem(lhs);
        var field = ExtractString(rhs);
        if (item is null || field is null) return Cel.Common.Types.Types.BoolOf(false);
        return Cel.Common.Types.Types.BoolOf(DiffHelpers.Changed(item, field));
    }

    private static IVal ChangedFn(IVal[] args)
    {
        if (args.Length < 2) return Cel.Common.Types.Types.BoolOf(false);
        return ChangedBinary(args[0], args[1]);
    }

    private static IVal BeforeBinary(IVal lhs, IVal rhs)
    {
        var item = ExtractDiffItem(lhs);
        var field = ExtractString(rhs);
        if (item is null || field is null) return NullT.NullValue;
        return WrapValue(DiffHelpers.Before(item, field));
    }

    private static IVal BeforeFn(IVal[] args)
    {
        if (args.Length < 2) return NullT.NullValue;
        return BeforeBinary(args[0], args[1]);
    }

    private static IVal AfterBinary(IVal lhs, IVal rhs)
    {
        var item = ExtractDiffItem(lhs);
        var field = ExtractString(rhs);
        if (item is null || field is null) return NullT.NullValue;
        return WrapValue(DiffHelpers.After(item, field));
    }

    private static IVal AfterFn(IVal[] args)
    {
        if (args.Length < 2) return NullT.NullValue;
        return AfterBinary(args[0], args[1]);
    }

    private static IVal HasTagBinary(IVal lhs, IVal rhs)
    {
        var tag = ExtractString(rhs);
        if (tag is null) return Cel.Common.Types.Types.BoolOf(false);

        var element = ExtractElementRef(lhs);
        if (element is not null)
            return Cel.Common.Types.Types.BoolOf(PredicateHelpers.HasTag(element, tag));

        var rel = ExtractRelationshipRef(lhs);
        if (rel is not null)
            return Cel.Common.Types.Types.BoolOf(PredicateHelpers.HasTag(rel, tag));

        return Cel.Common.Types.Types.BoolOf(false);
    }

    private static IVal HasTagFn(IVal[] args)
    {
        if (args.Length < 2) return Cel.Common.Types.Types.BoolOf(false);
        return HasTagBinary(args[0], args[1]);
    }

    private static IVal HasKindBinary(IVal lhs, IVal rhs)
    {
        var kind = ExtractString(rhs);
        if (kind is null) return Cel.Common.Types.Types.BoolOf(false);

        var element = ExtractElementRef(lhs);
        if (element is not null)
            return Cel.Common.Types.Types.BoolOf(PredicateHelpers.HasKind(element, kind));

        var rel = ExtractRelationshipRef(lhs);
        if (rel is not null)
            return Cel.Common.Types.Types.BoolOf(PredicateHelpers.HasKind(rel, kind));

        return Cel.Common.Types.Types.BoolOf(false);
    }

    private static IVal HasKindFn(IVal[] args)
    {
        if (args.Length < 2) return Cel.Common.Types.Types.BoolOf(false);
        return HasKindBinary(args[0], args[1]);
    }

    private static IReadOnlyList<object?>? ExtractList(IVal val)
    {
        if (val is NullT) return null;

        if (val is ListT listT)
        {
            var native = listT.Value();
            if (native is System.Collections.IList iList)
            {
                var result = new List<object?>();
                foreach (var item in iList)
                    result.Add(item is IVal v ? UnwrapValue(v) : item);
                return result;
            }
        }

        var objVal = val.Value();
        if (objVal is IReadOnlyList<object?> readOnlyList) return readOnlyList;
        if (objVal is IList<object?> list) return list.ToList();

        return null;
    }

    private static ElementRef? ExtractElementRef(IVal val)
    {
        if (val is ObjectT objT && objT.Value() is ElementRef el) return el;
        if (val.Value() is ElementRef el2) return el2;
        return null;
    }

    private static RelationshipRef? ExtractRelationshipRef(IVal val)
    {
        if (val is ObjectT objT && objT.Value() is RelationshipRef rel) return rel;
        if (val.Value() is RelationshipRef rel2) return rel2;
        return null;
    }

    private static DiffItem? ExtractDiffItem(IVal val)
    {
        if (val is ObjectT objT && objT.Value() is DiffItem di) return di;
        if (val.Value() is DiffItem di2) return di2;
        return null;
    }

    private static string? ExtractString(IVal val)
    {
        if (val is StringT strT) return (string)strT.Value();
        if (val.Value() is string s) return s;
        return null;
    }

    private static object? UnwrapValue(IVal val)
    {
        if (val is NullT) return null;
        if (val is BoolT b) return b.BooleanValue();
        if (val is IntT i) return i.IntValue();
        if (val is DoubleT d) return (double)d.Value();
        if (val is StringT s) return (string)s.Value();
        if (val is ObjectT o) return o.Value();
        return val.Value();
    }

    private static IVal WrapList(List<object?> items)
    {
        var vals = items.Select(WrapValue).ToArray();
        return ListT.NewValArrayList(Adapter, vals);
    }

    private static IVal WrapValue(object? value)
    {
        if (value is null) return NullT.NullValue;
        if (value is bool b) return Cel.Common.Types.Types.BoolOf(b);
        if (value is int i) return IntT.IntOf(i);
        if (value is long l) return IntT.IntOf(l);
        if (value is double d) return DoubleT.DoubleOf(d);
        if (value is string s) return StringT.StringOf(s);
        return Adapter(value);
    }
}
