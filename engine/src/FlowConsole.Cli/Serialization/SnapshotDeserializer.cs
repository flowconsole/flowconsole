using System.Text.Json;
using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;
using FlowConsole.Core.Factories;
using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Cli.Serialization;

/// <summary>
/// Deserializes a ModelSnapshot wire-format JSON document into domain types.
/// Used by CLI commands (e.g., --merge-with, fcon fmt) to read existing snapshots.
/// </summary>
internal static class SnapshotDeserializer
{
    public static ModelSnapshot Deserialize(JsonDocument document)
    {
        var root = document.RootElement;

        var sourceStr = root.TryGetProperty("source", out var srcProp) && srcProp.ValueKind == JsonValueKind.String
            ? srcProp.GetString() : null;
        var source = sourceStr is not null && ElementSourceParser.TryParse(sourceStr, out var es)
            ? es : ElementSource.CodeScan;

        var elements = new List<ElementBase>();
        if (root.TryGetProperty("elements", out var elemArr) && elemArr.ValueKind == JsonValueKind.Array)
        {
            foreach (var e in elemArr.EnumerateArray())
            {
                var elem = DeserializeElement(e, source);
                if (elem is not null)
                    elements.Add(elem);
            }
        }

        var relationships = new List<RelationshipBase>();
        if (root.TryGetProperty("relationships", out var relArr) && relArr.ValueKind == JsonValueKind.Array)
        {
            foreach (var r in relArr.EnumerateArray())
            {
                var rel = DeserializeRelationship(r, source);
                if (rel is not null)
                    relationships.Add(rel);
            }
        }

        return new ModelSnapshot(source, elements, relationships);
    }

    private static ElementBase? DeserializeElement(JsonElement e, ElementSource defaultSource)
    {
        var id = GetString(e, "id");
        var kindStr = GetString(e, "kind");
        var name = GetString(e, "name");

        if (id is null || kindStr is null || name is null)
        {
            var missing = new List<string>();
            if (id is null) missing.Add("id");
            if (kindStr is null) missing.Add("kind");
            if (name is null) missing.Add("name");
            Console.Error.WriteLine($"warning: skipping element with missing required field(s): {string.Join(", ", missing)}");
            return null;
        }

        if (!Enum.TryParse<ElementKind>(kindStr, ignoreCase: true, out var kind))
        {
            Console.Error.WriteLine($"warning: skipping element '{id}' with unknown kind '{kindStr}'");
            return null;
        }

        var sourceStr = GetString(e, "source");
        var source = sourceStr is not null && ElementSourceParser.TryParse(sourceStr, out var es)
            ? es : defaultSource;

        var properties = new Dictionary<string, string>();
        if (e.TryGetProperty("properties", out var propsEl) && propsEl.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in propsEl.EnumerateObject())
            {
                if (prop.Value.ValueKind == JsonValueKind.String)
                    properties[prop.Name] = prop.Value.GetString()!;
            }
        }

        var tags = new List<Tag>();
        if (e.TryGetProperty("tags", out var tagsEl) && tagsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var t in tagsEl.EnumerateArray())
            {
                if (t.ValueKind == JsonValueKind.String)
                    tags.Add(new Tag(t.GetString()!));
            }
        }

        var aliases = new List<string>();
        if (e.TryGetProperty("aliases", out var aliasEl) && aliasEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var a in aliasEl.EnumerateArray())
            {
                if (a.ValueKind == JsonValueKind.String)
                    aliases.Add(a.GetString()!);
            }
        }

        return ElementFactory.Create(
            kind: kind,
            id: new ElementId(id),
            name: name,
            source: source,
            description: GetString(e, "description"),
            technology: GetString(e, "technology"),
            parentId: GetString(e, "parentId") is { } pid ? new ElementId(pid) : null,
            canonicalId: GetString(e, "canonicalId"),
            aliases: aliases.Count > 0 ? aliases : null,
            properties: properties,
            tags: tags);
    }

    private static RelationshipBase? DeserializeRelationship(JsonElement r, ElementSource defaultSource)
    {
        var sourceId = GetString(r, "sourceId");
        var targetId = GetString(r, "targetId");
        var kindStr = GetString(r, "kind");

        if (sourceId is null || targetId is null || kindStr is null)
        {
            var missing = new List<string>();
            if (sourceId is null) missing.Add("sourceId");
            if (targetId is null) missing.Add("targetId");
            if (kindStr is null) missing.Add("kind");
            Console.Error.WriteLine($"warning: skipping relationship with missing required field(s): {string.Join(", ", missing)}");
            return null;
        }

        if (!Enum.TryParse<RelationKind>(kindStr, ignoreCase: true, out var kind))
        {
            Console.Error.WriteLine($"warning: skipping relationship '{sourceId}' -> '{targetId}' with unknown kind '{kindStr}'");
            return null;
        }

        var sourceStr = GetString(r, "source");
        var source = sourceStr is not null && ElementSourceParser.TryParse(sourceStr, out var es)
            ? es : defaultSource;

        var properties = new Dictionary<string, string>();
        if (r.TryGetProperty("properties", out var propsEl) && propsEl.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in propsEl.EnumerateObject())
            {
                if (prop.Value.ValueKind == JsonValueKind.String)
                    properties[prop.Name] = prop.Value.GetString()!;
            }
        }

        // Generate relationship ID from components
        var id = GetString(r, "id") ?? $"{sourceId}-{kind.ToString().ToLowerInvariant()}-{targetId}";

        return RelationshipFactory.Create(
            kind: kind,
            id: new RelationshipId(id),
            sourceId: new ElementId(sourceId),
            targetId: new ElementId(targetId),
            source: source,
            label: GetString(r, "label"),
            technology: GetString(r, "technology"),
            properties: properties);
    }

    private static string? GetString(JsonElement element, string property)
    {
        return element.TryGetProperty(property, out var prop) && prop.ValueKind == JsonValueKind.String
            ? prop.GetString()
            : null;
    }
}
