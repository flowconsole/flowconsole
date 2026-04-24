using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Snapshots.Mapping;

/// <summary>
/// Merges multiple <see cref="ModelSnapshot"/> instances into one,
/// deduplicating elements and relationships by ID (last wins).
/// Preserves single-source-per-partition semantic (per Decision #29).
/// </summary>
public static class SnapshotMerger
{
    public static ModelSnapshot Merge(
        IReadOnlyList<ModelSnapshot> snapshots, ElementSource source)
    {
        if (snapshots.Count == 0)
            return new ModelSnapshot(source, [], []);
        if (snapshots.Count == 1)
            return new ModelSnapshot(source, snapshots[0].Elements, snapshots[0].Relationships);

        var elements = snapshots.SelectMany(d => d.Elements)
            .GroupBy(e => e.Id.Value).Select(g => g.Last()).ToList();
        var relationships = snapshots.SelectMany(d => d.Relationships)
            .GroupBy(r => r.Id.Value).Select(g => g.Last()).ToList();

        return new ModelSnapshot(source, elements, relationships);
    }
}
