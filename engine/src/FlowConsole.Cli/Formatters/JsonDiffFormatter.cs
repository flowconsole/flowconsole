using System.Text.Json;
using System.Text.Json.Serialization;
using FlowConsole.Cli.Diff;

namespace FlowConsole.Cli.Formatters;

internal sealed class JsonDiffFormatter : IDiffFormatter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public string Format(DiffResult diff, string? onlyFilter)
    {
        var showAdded = onlyFilter is null or "added";
        var showRemoved = onlyFilter is null or "removed";
        var showChanged = onlyFilter is null or "changed";

        var output = new JsonDiffOutput
        {
            Added = showAdded ? BuildAddedSection(diff) : null,
            Removed = showRemoved ? BuildRemovedSection(diff) : null,
            Changed = showChanged ? BuildChangedSection(diff) : null
        };

        return JsonSerializer.Serialize(output, JsonOptions);
    }

    private static JsonDiffAddedRemoved? BuildAddedSection(DiffResult diff)
    {
        if (diff.AddedElements.Count == 0 && diff.AddedRelationships.Count == 0)
            return new JsonDiffAddedRemoved { Elements = [], Relationships = [] };

        return new JsonDiffAddedRemoved
        {
            Elements = diff.AddedElements.Select(e => new JsonDiffElementEntry
            {
                Id = e.Id,
                Kind = e.Kind,
                Name = e.Name,
                Technology = e.Technology,
                Source = e.Source
            }).ToList(),
            Relationships = diff.AddedRelationships.Select(r => new JsonDiffRelEntry
            {
                SourceId = r.SourceId,
                TargetId = r.TargetId,
                Kind = r.Kind,
                Label = r.Label,
                Technology = r.Technology
            }).ToList()
        };
    }

    private static JsonDiffAddedRemoved? BuildRemovedSection(DiffResult diff)
    {
        if (diff.RemovedElements.Count == 0 && diff.RemovedRelationships.Count == 0)
            return new JsonDiffAddedRemoved { Elements = [], Relationships = [] };

        return new JsonDiffAddedRemoved
        {
            Elements = diff.RemovedElements.Select(e => new JsonDiffElementEntry
            {
                Id = e.Id,
                Kind = e.Kind,
                Name = e.Name,
                Technology = e.Technology,
                Source = e.Source
            }).ToList(),
            Relationships = diff.RemovedRelationships.Select(r => new JsonDiffRelEntry
            {
                SourceId = r.SourceId,
                TargetId = r.TargetId,
                Kind = r.Kind,
                Label = r.Label,
                Technology = r.Technology
            }).ToList()
        };
    }

    private static JsonDiffChangedSection? BuildChangedSection(DiffResult diff)
    {
        if (diff.ChangedElements.Count == 0 && diff.ChangedRelationships.Count == 0)
            return new JsonDiffChangedSection { Elements = [], Relationships = [] };

        return new JsonDiffChangedSection
        {
            Elements = diff.ChangedElements.Select(e => new JsonDiffChangedElement
            {
                Before = new JsonDiffElementEntry
                {
                    Id = e.Before.Id,
                    Kind = e.Before.Kind,
                    Name = e.Before.Name,
                    Technology = e.Before.Technology,
                    Source = e.Before.Source
                },
                After = new JsonDiffElementEntry
                {
                    Id = e.After.Id,
                    Kind = e.After.Kind,
                    Name = e.After.Name,
                    Technology = e.After.Technology,
                    Source = e.After.Source
                },
                FieldChanges = e.FieldChanges.Select(f => new JsonFieldChange
                {
                    Field = f.Field,
                    Before = f.Before,
                    After = f.After
                }).ToList()
            }).ToList(),
            Relationships = diff.ChangedRelationships.Select(r => new JsonDiffChangedRel
            {
                Before = new JsonDiffRelEntry
                {
                    SourceId = r.Before.SourceId,
                    TargetId = r.Before.TargetId,
                    Kind = r.Before.Kind,
                    Label = r.Before.Label,
                    Technology = r.Before.Technology
                },
                After = new JsonDiffRelEntry
                {
                    SourceId = r.After.SourceId,
                    TargetId = r.After.TargetId,
                    Kind = r.After.Kind,
                    Label = r.After.Label,
                    Technology = r.After.Technology
                },
                FieldChanges = r.FieldChanges.Select(f => new JsonFieldChange
                {
                    Field = f.Field,
                    Before = f.Before,
                    After = f.After
                }).ToList()
            }).ToList()
        };
    }
}

internal sealed class JsonDiffOutput
{
    public JsonDiffAddedRemoved? Added { get; set; }
    public JsonDiffAddedRemoved? Removed { get; set; }
    public JsonDiffChangedSection? Changed { get; set; }
}

internal sealed class JsonDiffAddedRemoved
{
    public List<JsonDiffElementEntry> Elements { get; set; } = [];
    public List<JsonDiffRelEntry> Relationships { get; set; } = [];
}

internal sealed class JsonDiffChangedSection
{
    public List<JsonDiffChangedElement> Elements { get; set; } = [];
    public List<JsonDiffChangedRel> Relationships { get; set; } = [];
}

internal sealed class JsonDiffElementEntry
{
    public string Id { get; set; } = "";
    public string Kind { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Technology { get; set; }
    public string Source { get; set; } = "";
}

internal sealed class JsonDiffRelEntry
{
    public string SourceId { get; set; } = "";
    public string TargetId { get; set; } = "";
    public string Kind { get; set; } = "";
    public string? Label { get; set; }
    public string? Technology { get; set; }
}

internal sealed class JsonDiffChangedElement
{
    public JsonDiffElementEntry Before { get; set; } = new();
    public JsonDiffElementEntry After { get; set; } = new();
    public List<JsonFieldChange> FieldChanges { get; set; } = [];
}

internal sealed class JsonDiffChangedRel
{
    public JsonDiffRelEntry Before { get; set; } = new();
    public JsonDiffRelEntry After { get; set; } = new();
    public List<JsonFieldChange> FieldChanges { get; set; } = [];
}

internal sealed class JsonFieldChange
{
    public string Field { get; set; } = "";
    public string? Before { get; set; }
    public string? After { get; set; }
}
