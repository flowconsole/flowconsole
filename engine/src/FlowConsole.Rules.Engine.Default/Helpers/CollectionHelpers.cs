namespace FlowConsole.Rules.Engine.Default.Helpers;

/// <summary>
/// Pure C# implementations of collection helper functions defined in helpers.md.
/// count, distinct, exists, all, any, none.
/// </summary>
internal static class CollectionHelpers
{
    /// <summary>
    /// count(value: list) -> int
    /// Null behavior: count(null) -> runtime error (caller checks). Empty -> 0.
    /// </summary>
    public static int Count(IEnumerable<object?> value)
    {
        return value switch
        {
            IReadOnlyCollection<object?> col => col.Count,
            ICollection<object?> col => col.Count,
            _ => value.Count()
        };
    }

    /// <summary>
    /// count(value: list, predicate) -> int
    /// Counts elements satisfying predicate.
    /// </summary>
    public static int Count(IEnumerable<object?> value, Func<object?, bool> predicate)
    {
        var count = 0;
        foreach (var item in value)
        {
            if (predicate(item))
                count++;
        }
        return count;
    }

    /// <summary>
    /// distinct(value: list) -> list
    /// Removes duplicates by equality. First occurrence preserved.
    /// </summary>
    public static List<object?> Distinct(IEnumerable<object?> value)
    {
        var seen = new HashSet<object?>();
        var result = new List<object?>();
        foreach (var item in value)
        {
            if (seen.Add(item))
                result.Add(item);
        }
        return result;
    }

    /// <summary>
    /// distinct(value: list, keyExpr) -> list
    /// Removes duplicates by key expression. First occurrence preserved.
    /// </summary>
    public static List<object?> Distinct(IEnumerable<object?> value, Func<object?, object?> keyExpr)
    {
        var seen = new HashSet<object?>();
        var result = new List<object?>();
        foreach (var item in value)
        {
            var key = keyExpr(item);
            if (seen.Add(key))
                result.Add(item);
        }
        return result;
    }

    /// <summary>
    /// exists(value: list, predicate) -> bool
    /// True if at least one element satisfies predicate.
    /// Empty -> false. Short-circuit on first match.
    /// </summary>
    public static bool Exists(IEnumerable<object?> value, Func<object?, bool> predicate)
    {
        foreach (var item in value)
        {
            if (predicate(item))
                return true;
        }
        return false;
    }

    /// <summary>
    /// all(value: list, predicate) -> bool
    /// True if all elements satisfy predicate.
    /// Empty -> true (vacuous truth). Short-circuit on first non-match.
    /// </summary>
    public static bool All(IEnumerable<object?> value, Func<object?, bool> predicate)
    {
        foreach (var item in value)
        {
            if (!predicate(item))
                return false;
        }
        return true;
    }

    /// <summary>
    /// any = alias for exists.
    /// </summary>
    public static bool Any(IEnumerable<object?> value, Func<object?, bool> predicate)
        => Exists(value, predicate);

    /// <summary>
    /// none(value: list, predicate) -> bool
    /// True if no element satisfies predicate.
    /// Empty -> true. Short-circuit on first match.
    /// </summary>
    public static bool None(IEnumerable<object?> value, Func<object?, bool> predicate)
    {
        foreach (var item in value)
        {
            if (predicate(item))
                return false;
        }
        return true;
    }
}
