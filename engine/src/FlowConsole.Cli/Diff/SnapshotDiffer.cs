using System.Text.Json;

namespace FlowConsole.Cli.Diff;

internal static class SnapshotDiffer
{
    public static DiffResult Compare(JsonDocument before, JsonDocument after)
    {
        var beforeElements = ExtractElements(before);
        var afterElements = ExtractElements(after);
        var beforeRels = ExtractRelationships(before);
        var afterRels = ExtractRelationships(after);

        var addedElements = new List<DiffElement>();
        var removedElements = new List<DiffElement>();
        var changedElements = new List<ChangedElement>();

        var beforeElementMap = beforeElements
            .GroupBy(e => e.Id, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.Ordinal);
        var afterElementMap = afterElements
            .GroupBy(e => e.Id, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.Ordinal);

        foreach (var after_ in afterElementMap.Values)
        {
            if (!beforeElementMap.TryGetValue(after_.Id, out var before_))
            {
                addedElements.Add(after_);
            }
            else
            {
                var fieldChanges = CompareElementFields(before_, after_);
                if (fieldChanges.Count > 0)
                    changedElements.Add(new ChangedElement(before_, after_, fieldChanges));
            }
        }

        foreach (var before_ in beforeElementMap.Values)
        {
            if (!afterElementMap.ContainsKey(before_.Id))
                removedElements.Add(before_);
        }

        var addedRels = new List<DiffRelationship>();
        var removedRels = new List<DiffRelationship>();
        var changedRels = new List<ChangedRelationship>();

        var beforeRelMap = beforeRels
            .GroupBy(r => r.Key, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.Ordinal);
        var afterRelMap = afterRels
            .GroupBy(r => r.Key, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.Ordinal);

        foreach (var after_ in afterRelMap.Values)
        {
            if (!beforeRelMap.TryGetValue(after_.Key, out var before_))
            {
                addedRels.Add(after_);
            }
            else
            {
                var fieldChanges = CompareRelationshipFields(before_, after_);
                if (fieldChanges.Count > 0)
                    changedRels.Add(new ChangedRelationship(before_, after_, fieldChanges));
            }
        }

        foreach (var before_ in beforeRelMap.Values)
        {
            if (!afterRelMap.ContainsKey(before_.Key))
                removedRels.Add(before_);
        }

        return new DiffResult(
            addedElements, removedElements, changedElements,
            addedRels, removedRels, changedRels);
    }

    private static List<DiffElement> ExtractElements(JsonDocument doc)
    {
        var result = new List<DiffElement>();
        if (doc.RootElement.TryGetProperty("elements", out var elements) &&
            elements.ValueKind == JsonValueKind.Array)
        {
            foreach (var elem in elements.EnumerateArray())
            {
                result.Add(new DiffElement(
                    Id: GetString(elem, "id") ?? "",
                    Kind: GetString(elem, "kind") ?? "",
                    Name: GetString(elem, "name") ?? "",
                    Description: GetString(elem, "description"),
                    Technology: GetString(elem, "technology"),
                    ParentId: GetString(elem, "parentId"),
                    Source: GetString(elem, "source") ?? "",
                    CanonicalId: GetString(elem, "canonicalId"),
                    Tags: GetStringArray(elem, "tags"),
                    Properties: GetRawJson(elem, "properties")));
            }
        }
        return result;
    }

    private static List<DiffRelationship> ExtractRelationships(JsonDocument doc)
    {
        var result = new List<DiffRelationship>();
        if (doc.RootElement.TryGetProperty("relationships", out var rels) &&
            rels.ValueKind == JsonValueKind.Array)
        {
            foreach (var rel in rels.EnumerateArray())
            {
                var sourceId = GetString(rel, "sourceId") ?? "";
                var targetId = GetString(rel, "targetId") ?? "";
                var kind = GetString(rel, "kind") ?? "";
                result.Add(new DiffRelationship(
                    Key: $"{sourceId}|{targetId}|{kind}",
                    SourceId: sourceId,
                    TargetId: targetId,
                    Kind: kind,
                    Label: GetString(rel, "label"),
                    Technology: GetString(rel, "technology"),
                    Source: GetString(rel, "source") ?? "",
                    Properties: GetRawJson(rel, "properties")));
            }
        }
        return result;
    }

    private static List<FieldChange> CompareElementFields(DiffElement before, DiffElement after)
    {
        var changes = new List<FieldChange>();
        CompareField(changes, "kind", before.Kind, after.Kind);
        CompareField(changes, "name", before.Name, after.Name);
        CompareField(changes, "description", before.Description, after.Description);
        CompareField(changes, "technology", before.Technology, after.Technology);
        CompareField(changes, "parentId", before.ParentId, after.ParentId);
        CompareField(changes, "source", before.Source, after.Source);
        CompareField(changes, "canonicalId", before.CanonicalId, after.CanonicalId);
        CompareField(changes, "tags", string.Join(",", before.Tags), string.Join(",", after.Tags));
        CompareField(changes, "properties", before.Properties, after.Properties);
        return changes;
    }

    private static List<FieldChange> CompareRelationshipFields(DiffRelationship before, DiffRelationship after)
    {
        var changes = new List<FieldChange>();
        CompareField(changes, "label", before.Label, after.Label);
        CompareField(changes, "technology", before.Technology, after.Technology);
        CompareField(changes, "source", before.Source, after.Source);
        CompareField(changes, "properties", before.Properties, after.Properties);
        return changes;
    }

    private static void CompareField(List<FieldChange> changes, string field, string? before, string? after)
    {
        if (!string.Equals(before ?? "", after ?? "", StringComparison.Ordinal))
            changes.Add(new FieldChange(field, before, after));
    }

    private static string? GetString(JsonElement elem, string prop) =>
        elem.TryGetProperty(prop, out var val) && val.ValueKind == JsonValueKind.String
            ? val.GetString()
            : null;

    private static List<string> GetStringArray(JsonElement elem, string prop)
    {
        if (elem.TryGetProperty(prop, out var val) && val.ValueKind == JsonValueKind.Array)
            return val.EnumerateArray()
                .Where(v => v.ValueKind == JsonValueKind.String)
                .Select(v => v.GetString()!)
                .ToList();
        return [];
    }

    private static string? GetRawJson(JsonElement elem, string prop) =>
        elem.TryGetProperty(prop, out var val) && val.ValueKind == JsonValueKind.Object
            ? val.GetRawText()
            : null;
}

internal sealed record DiffElement(
    string Id,
    string Kind,
    string Name,
    string? Description,
    string? Technology,
    string? ParentId,
    string Source,
    string? CanonicalId,
    List<string> Tags,
    string? Properties);

internal sealed record DiffRelationship(
    string Key,
    string SourceId,
    string TargetId,
    string Kind,
    string? Label,
    string? Technology,
    string Source,
    string? Properties);

internal sealed record FieldChange(string Field, string? Before, string? After);

internal sealed record ChangedElement(DiffElement Before, DiffElement After, List<FieldChange> FieldChanges);

internal sealed record ChangedRelationship(DiffRelationship Before, DiffRelationship After, List<FieldChange> FieldChanges);

internal sealed record DiffResult(
    List<DiffElement> AddedElements,
    List<DiffElement> RemovedElements,
    List<ChangedElement> ChangedElements,
    List<DiffRelationship> AddedRelationships,
    List<DiffRelationship> RemovedRelationships,
    List<ChangedRelationship> ChangedRelationships)
{
    public bool IsEmpty =>
        AddedElements.Count == 0 && RemovedElements.Count == 0 && ChangedElements.Count == 0 &&
        AddedRelationships.Count == 0 && RemovedRelationships.Count == 0 && ChangedRelationships.Count == 0;
}
