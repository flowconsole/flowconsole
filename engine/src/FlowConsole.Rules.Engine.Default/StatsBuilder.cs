using FlowConsole.Rules.Core.Bindings;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Builds Stats aggregates from subject sets.
/// </summary>
internal static class StatsBuilder
{
    public static Stats FromElements(IReadOnlyList<ElementRef> elements)
    {
        var countByKind = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var countByTag = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var countBySourceFamily = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var distinctTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var el in elements)
        {
            Increment(countByKind, el.Kind);
            Increment(countBySourceFamily, el.SourceFamily);

            foreach (var tag in el.Tags)
            {
                Increment(countByTag, tag);
                distinctTags.Add(tag);
            }
        }

        return new Stats
        {
            Count = elements.Count,
            CountByKind = countByKind,
            CountByTag = countByTag,
            CountBySourceFamily = countBySourceFamily,
            DistinctTags = distinctTags.Order().ToList()
        };
    }

    public static Stats FromRelationships(IReadOnlyList<RelationshipRef> relationships)
    {
        var countByKind = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var countByTag = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var countBySourceFamily = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var distinctTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var rel in relationships)
        {
            Increment(countByKind, rel.Kind);
            Increment(countBySourceFamily, rel.SourceFamily);

            foreach (var tag in rel.Tags)
            {
                Increment(countByTag, tag);
                distinctTags.Add(tag);
            }
        }

        return new Stats
        {
            Count = relationships.Count,
            CountByKind = countByKind,
            CountByTag = countByTag,
            CountBySourceFamily = countBySourceFamily,
            DistinctTags = distinctTags.Order().ToList()
        };
    }

    public static Stats FromDiffItems(IReadOnlyList<DiffItem> items)
    {
        var countByKind = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var countByTag = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var countBySourceFamily = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var distinctTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var di in items)
        {
            // For diff items, countByKind is by changeKind
            Increment(countByKind, di.ChangeKind);

            var observed = di.Actual ?? di.Model;
            if (observed is not null)
            {
                Increment(countBySourceFamily, observed.SourceFamily);
                foreach (var tag in observed.Tags)
                {
                    Increment(countByTag, tag);
                    distinctTags.Add(tag);
                }
            }
        }

        return new Stats
        {
            Count = items.Count,
            CountByKind = countByKind,
            CountByTag = countByTag,
            CountBySourceFamily = countBySourceFamily,
            DistinctTags = distinctTags.Order().ToList()
        };
    }

    public static Stats FromPaths(IReadOnlyList<PathRef> paths)
    {
        var countByKind = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var countByTag = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var countBySourceFamily = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var distinctTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // For path rules: count=number of paths, rest by all nodes across paths (no dedup)
        foreach (var path in paths)
        {
            foreach (var node in path.Nodes)
            {
                Increment(countByKind, node.Kind);
                Increment(countBySourceFamily, node.SourceFamily);
                foreach (var tag in node.Tags)
                {
                    Increment(countByTag, tag);
                    distinctTags.Add(tag);
                }
            }
        }

        return new Stats
        {
            Count = paths.Count,
            CountByKind = countByKind,
            CountByTag = countByTag,
            CountBySourceFamily = countBySourceFamily,
            DistinctTags = distinctTags.Order().ToList()
        };
    }

    private static void Increment(Dictionary<string, int> dict, string key)
    {
        if (!dict.TryAdd(key, 1))
            dict[key]++;
    }
}
