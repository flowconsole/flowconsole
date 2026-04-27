namespace FlowConsole.Rules.Core.Bindings;

/// <summary>
/// Aggregated statistics over the subject set of a rule.
/// </summary>
public sealed record Stats
{
    public required int Count { get; init; }
    public IReadOnlyDictionary<string, int> CountByKind { get; init; } =
        new Dictionary<string, int>();
    public IReadOnlyDictionary<string, int> CountByTag { get; init; } =
        new Dictionary<string, int>();
    public IReadOnlyDictionary<string, int> CountBySourceFamily { get; init; } =
        new Dictionary<string, int>();
    public IReadOnlyList<string> DistinctTags { get; init; } = [];
}
