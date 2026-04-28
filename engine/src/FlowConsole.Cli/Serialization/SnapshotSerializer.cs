using System.Text.Json;
using System.Text.Json.Nodes;
using FlowConsole.Core.Entities;
using FlowConsole.Core.Entities.Elements;
using FlowConsole.Core.Entities.Relations;

namespace FlowConsole.Cli.Serialization;

internal static class SnapshotSerializer
{
    public const string SchemaUri = "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json";
    public const string SchemaVersion = "1.1.0";

    public static string Serialize(ModelSnapshot snapshot, JsonSerializerOptions? options = null)
    {
        var node = ToJsonObject(snapshot);
        options ??= new JsonSerializerOptions { WriteIndented = true };
        return node.ToJsonString(options);
    }

    public static JsonDocument ToJsonDocument(ModelSnapshot snapshot)
    {
        var json = Serialize(snapshot, new JsonSerializerOptions { WriteIndented = false });
        return JsonDocument.Parse(json);
    }

    public static JsonObject ToJsonObject(ModelSnapshot snapshot)
    {
        var elements = snapshot.Elements
            .OrderBy(e => e.Id.Value, StringComparer.Ordinal)
            .Select(MapElement)
            .ToList();

        var relationships = snapshot.Relationships
            .OrderBy(r => r.SourceId.Value, StringComparer.Ordinal)
            .ThenBy(r => r.TargetId.Value, StringComparer.Ordinal)
            .ThenBy(r => r.Kind.ToString(), StringComparer.Ordinal)
            .Select(MapRelationship)
            .ToList();

        var obj = new JsonObject
        {
            ["$schema"] = SchemaUri,
            ["schemaVersion"] = SchemaVersion,
            ["source"] = snapshot.Source.ToString(),
            ["elements"] = new JsonArray(elements.ToArray<JsonNode>()),
            ["relationships"] = new JsonArray(relationships.ToArray<JsonNode>())
        };

        if (snapshot.Flows is { Count: > 0 })
        {
            var flowsArray = new JsonArray();
            foreach (var flow in snapshot.Flows.OrderBy(f => f.Id, StringComparer.Ordinal))
            {
                flowsArray.Add(MapFlow(flow));
            }
            obj["flows"] = flowsArray;
        }

        return obj;
    }

    public static string Normalize(string json, int indent = 2, bool useTabs = false)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var obj = new JsonObject
        {
            ["$schema"] = GetStringOrNull(root, "$schema"),
            ["schemaVersion"] = GetStringOrNull(root, "schemaVersion"),
            ["source"] = GetStringOrNull(root, "source")
        };

        if (root.TryGetProperty("elements", out var elemArr) && elemArr.ValueKind == JsonValueKind.Array)
        {
            var sorted = elemArr.EnumerateArray()
                .OrderBy(e => e.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "", StringComparer.Ordinal)
                .Select(e => JsonNode.Parse(e.GetRawText())!)
                .ToArray();
            obj["elements"] = new JsonArray(sorted);
        }
        else
        {
            obj["elements"] = new JsonArray();
        }

        if (root.TryGetProperty("relationships", out var relArr) && relArr.ValueKind == JsonValueKind.Array)
        {
            var sorted = relArr.EnumerateArray()
                .OrderBy(r => r.TryGetProperty("sourceId", out var s) ? s.GetString() ?? "" : "", StringComparer.Ordinal)
                .ThenBy(r => r.TryGetProperty("targetId", out var t) ? t.GetString() ?? "" : "", StringComparer.Ordinal)
                .ThenBy(r => r.TryGetProperty("kind", out var k) ? k.GetString() ?? "" : "", StringComparer.Ordinal)
                .Select(r => JsonNode.Parse(r.GetRawText())!)
                .ToArray();
            obj["relationships"] = new JsonArray(sorted);
        }
        else
        {
            obj["relationships"] = new JsonArray();
        }

        if (root.TryGetProperty("flows", out var flowArr) && flowArr.ValueKind == JsonValueKind.Array)
        {
            var sorted = flowArr.EnumerateArray()
                .OrderBy(f => f.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "", StringComparer.Ordinal)
                .Select(f => JsonNode.Parse(f.GetRawText())!)
                .ToArray();
            obj["flows"] = new JsonArray(sorted);
        }

        // Preserve unknown top-level fields (forward-compat for minor-ahead snapshots)
        var knownKeys = new HashSet<string>(StringComparer.Ordinal)
            { "$schema", "schemaVersion", "source", "elements", "relationships", "flows" };
        foreach (var prop in root.EnumerateObject())
        {
            if (!knownKeys.Contains(prop.Name))
                obj[prop.Name] = JsonNode.Parse(prop.Value.GetRawText());
        }

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            IndentSize = 2
        };

        var result = obj.ToJsonString(options);

        if (useTabs)
        {
            result = ReplaceLeadingIndent(result, 2, "\t");
        }
        else if (indent == 4)
        {
            result = ReplaceIndent(result, 2, 4);
        }

        return result;
    }

    private static string? GetStringOrNull(JsonElement root, string property)
    {
        return root.TryGetProperty(property, out var prop) && prop.ValueKind == JsonValueKind.String
            ? prop.GetString()
            : null;
    }

    private static string ReplaceLeadingIndent(string json, int fromSpaces, string toUnit)
    {
        var from = new string(' ', fromSpaces);
        var lines = json.Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i];
            var indent = 0;
            while (indent + fromSpaces <= line.Length && line.Substring(indent, fromSpaces) == from)
                indent += fromSpaces;

            if (indent > 0)
            {
                var level = indent / fromSpaces;
                lines[i] = string.Concat(Enumerable.Repeat(toUnit, level)) + line[indent..];
            }
        }
        return string.Join('\n', lines);
    }

    private static string ReplaceIndent(string json, int fromSpaces, int toSpaces)
    {
        var from = new string(' ', fromSpaces);
        var to = new string(' ', toSpaces);
        var lines = json.Split('\n');
        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i];
            var indent = 0;
            while (indent + fromSpaces <= line.Length && line.Substring(indent, fromSpaces) == from)
                indent += fromSpaces;

            if (indent > 0)
            {
                var level = indent / fromSpaces;
                lines[i] = new string(' ', level * toSpaces) + line[indent..];
            }
        }
        return string.Join('\n', lines);
    }

    private static JsonObject MapFlow(Flow flow)
    {
        var obj = new JsonObject
        {
            ["id"] = flow.Id,
            ["name"] = flow.Name
        };

        if (flow.Description is not null)
            obj["description"] = flow.Description;

        var stepsArray = new JsonArray();
        foreach (var step in flow.Steps)
        {
            stepsArray.Add(MapFlowStep(step));
        }
        obj["steps"] = stepsArray;

        return obj;
    }

    private static JsonObject MapFlowStep(FlowStep step)
    {
        var obj = new JsonObject
        {
            ["sourceElementId"] = step.SourceElementId
        };

        if (step.RelationshipId is not null)
            obj["relationshipId"] = step.RelationshipId;

        if (step.Label is not null)
            obj["label"] = step.Label;

        if (step.Properties is { Count: > 0 })
        {
            var props = new JsonObject();
            foreach (var kv in step.Properties)
                props[kv.Key] = kv.Value;
            obj["properties"] = props;
        }

        return obj;
    }

    private static JsonObject MapElement(ElementBase element)
    {
        var obj = new JsonObject
        {
            ["id"] = element.Id.Value,
            ["kind"] = element.Kind.ToString(),
            ["name"] = element.Name
        };

        if (element.Description is not null)
            obj["description"] = element.Description;
        if (element.Technology is not null)
            obj["technology"] = element.Technology;
        if (element.ParentId is { } parentId)
            obj["parentId"] = parentId.Value;
        obj["source"] = element.Source.ToString();
        if (element.CanonicalId is not null)
            obj["canonicalId"] = element.CanonicalId;
        if (element.Aliases is { Count: > 0 })
            obj["aliases"] = new JsonArray(element.Aliases.Select(a => (JsonNode)JsonValue.Create(a)!).ToArray());
        if (element.Properties is { Count: > 0 })
        {
            var props = new JsonObject();
            foreach (var kv in element.Properties)
                props[kv.Key] = kv.Value;
            obj["properties"] = props;
        }
        if (element.Tags is { Count: > 0 })
            obj["tags"] = new JsonArray(element.Tags.Select(t => (JsonNode)JsonValue.Create(t.Value)!).ToArray());

        return obj;
    }

    private static JsonObject MapRelationship(RelationshipBase rel)
    {
        var obj = new JsonObject
        {
            ["id"] = rel.Id.Value,
            ["sourceId"] = rel.SourceId.Value,
            ["targetId"] = rel.TargetId.Value,
            ["kind"] = rel.Kind.ToString()
        };

        if (rel.Label is not null)
            obj["label"] = rel.Label;
        if (rel.Technology is not null)
            obj["technology"] = rel.Technology;
        obj["source"] = rel.Source.ToString();
        if (rel.Properties is { Count: > 0 })
        {
            var props = new JsonObject();
            foreach (var kv in rel.Properties)
                props[kv.Key] = kv.Value;
            obj["properties"] = props;
        }

        return obj;
    }
}
