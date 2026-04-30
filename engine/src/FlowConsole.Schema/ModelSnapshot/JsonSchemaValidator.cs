using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using FluentResults;
using Json.Schema;

namespace FlowConsole.Schema.SnapshotValidation;

/// <summary>
/// Validates raw JSON documents against the ModelSnapshot v1 JSON Schema.
/// Performs syntactic validation (schema phase), version negotiation (version phase),
/// and reference integrity checks (reference phase).
/// </summary>
public sealed class JsonSchemaValidator : IJsonSchemaValidator
{
    private const int SupportedMajor = 1;
    private const int SupportedMinor = 1;
    private const string ExpectedSchemaUri = "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json";

    private static readonly Lazy<JsonSchema> SchemaInstance = new(LoadEmbeddedSchema);
    private static readonly Lock SchemaLock = new();

    public Result<IReadOnlyList<SchemaDiagnostic>> Validate(JsonDocument document)
    {
        var diagnostics = new List<SchemaDiagnostic>();

        // -- Pre-schema checks: $schema and schemaVersion presence ----------
        var root = document.RootElement;

        if (root.ValueKind != JsonValueKind.Object)
        {
            diagnostics.Add(new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_INVALID_TYPE,
                DiagnosticLevel.Error,
                "/",
                "Root must be a JSON object"));
            return Result.Ok<IReadOnlyList<SchemaDiagnostic>>(diagnostics);
        }

        var hasSchema = root.TryGetProperty("$schema", out var schemaProp);
        var hasVersion = root.TryGetProperty("schemaVersion", out var versionProp);

        if (!hasSchema)
        {
            diagnostics.Add(new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_FIELD_MISSING,
                DiagnosticLevel.Error,
                "/",
                "Top-level '$schema' field is absent"));
        }
        else if (schemaProp.ValueKind == JsonValueKind.String
                 && schemaProp.GetString() is { } schemaUri
                 && schemaUri != ExpectedSchemaUri)
        {
            diagnostics.Add(new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_INVALID_ENUM_VALUE,
                DiagnosticLevel.Error,
                "/$schema",
                $"'$schema' URI '{schemaUri}' does not match expected '{ExpectedSchemaUri}'"));
        }

        if (!hasVersion)
        {
            diagnostics.Add(new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MISSING,
                DiagnosticLevel.Error,
                "/",
                "Top-level 'schemaVersion' field is absent"));
        }

        // If either is missing, we still continue schema validation below
        // to catch additional errors, but version negotiation is skipped.

        if (hasVersion && versionProp.ValueKind == JsonValueKind.String)
        {
            var versionStr = versionProp.GetString();
            if (versionStr is not null && TryParseSemver(versionStr, out var major, out var minor, out _))
            {
                if (major != SupportedMajor)
                {
                    diagnostics.Add(new SchemaDiagnostic(
                        SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MAJOR_MISMATCH,
                        DiagnosticLevel.Error,
                        "/schemaVersion",
                        $"Major version {major} does not match supported major version {SupportedMajor}"));
                    // Major mismatch is blocking
                    return Result.Ok<IReadOnlyList<SchemaDiagnostic>>(diagnostics);
                }

                if (minor > SupportedMinor)
                {
                    diagnostics.Add(new SchemaDiagnostic(
                        SnapshotDiagnosticCodes.SNAPSHOT_VERSION_MINOR_AHEAD,
                        DiagnosticLevel.Warning,
                        "/schemaVersion",
                        $"Minor version {major}.{minor} is ahead of supported {SupportedMajor}.{SupportedMinor} — unknown fields preserved"));
                }
                // Patch differences are silent — no diagnostic emitted.
            }
        }

        // JsonSchema.Net's Evaluate is not thread-safe on the same schema instance;
        // serialize access to prevent flaky results under concurrent use.
        var schema = SchemaInstance.Value;
        var node = JsonNode.Parse(document.RootElement.GetRawText());
        EvaluationResults result;
        lock (SchemaLock)
        {
            var evalOptions = new EvaluationOptions
            {
                OutputFormat = OutputFormat.Hierarchical
            };
            result = schema.Evaluate(node, evalOptions);
        }

        if (!result.IsValid)
        {
            var schemaErrors = MapSchemaErrors(result, root);
            diagnostics.AddRange(schemaErrors);
        }

        // If there are schema-phase errors, skip reference phase
        if (diagnostics.Any(d => d.Phase == "schema" && d.Level == DiagnosticLevel.Error))
        {
            return Result.Ok<IReadOnlyList<SchemaDiagnostic>>(diagnostics);
        }

        // -- Reference phase (semantic after successful schema validation) --
        var refDiagnostics = ValidateReferences(root);
        diagnostics.AddRange(refDiagnostics);

        return Result.Ok<IReadOnlyList<SchemaDiagnostic>>(diagnostics);
    }

    private static List<SchemaDiagnostic> MapSchemaErrors(EvaluationResults results, JsonElement root)
    {
        var diagnostics = new List<SchemaDiagnostic>();

        // Check root-level errors first (some output formats report here)
        if (!results.IsValid && results.Errors is { Count: > 0 })
        {
            var path = results.InstanceLocation?.ToString() ?? "/";
            if (string.IsNullOrEmpty(path)) path = "/";
            var evalPath = results.EvaluationPath?.ToString() ?? "";
            foreach (var error in results.Errors)
            {
                var diagnostic = ClassifyError(error.Key, error.Value, path, evalPath, root);
                if (diagnostic is not null)
                    diagnostics.Add(diagnostic);
            }
        }

        CollectErrors(results.Details ?? [], diagnostics, root);
        return DeduplicateDiagnostics(diagnostics);
    }

    private static void CollectErrors(IReadOnlyList<EvaluationResults> details, List<SchemaDiagnostic> diagnostics, JsonElement root)
    {
        foreach (var detail in details)
        {
            if (detail.IsValid)
                continue;

            // Check for errors on this node (use Errors directly — HasErrors may be false
            // in some output formats even when Errors is populated)
            if (detail.Errors is { Count: > 0 })
            {
                var path = detail.InstanceLocation?.ToString() ?? "/";
                if (string.IsNullOrEmpty(path)) path = "/";
                var evalPath = detail.EvaluationPath?.ToString() ?? "";

                foreach (var error in detail.Errors)
                {
                    var diagnostic = ClassifyError(error.Key, error.Value, path, evalPath, root);
                    if (diagnostic is not null)
                        diagnostics.Add(diagnostic);
                }
            }

            // Recurse into nested details (structural keywords like allOf/if/then
            // may contain real errors in their children)
            if (detail.Details is { Count: > 0 })
            {
                CollectErrors(detail.Details, diagnostics, root);
            }
        }
    }

    private static SchemaDiagnostic? ClassifyError(string errorKey, string errorMessage, string path, string evalPath, JsonElement root)
    {
        // JsonSchema.Net sometimes uses empty key with the eval path indicating the keyword
        var effectiveKey = !string.IsNullOrEmpty(errorKey)
            ? errorKey
            : ExtractKeywordFromEvalPath(evalPath);

        // Map JSON Schema error keywords to SNAPSHOT_* diagnostic codes
        return effectiveKey switch
        {
            "required" => ClassifyRequiredError(errorMessage, path, root),
            "type" => new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_INVALID_TYPE,
                DiagnosticLevel.Error,
                path,
                errorMessage),
            "additionalProperties" => new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_UNKNOWN_FIELD,
                DiagnosticLevel.Error,
                GetParentPath(path),
                $"Unknown field '{GetLastSegment(path)}'"),
            "enum" => ClassifyEnumError(path, errorMessage, root),
            "const" => null, // $schema const mismatch is handled via FIELD_MISSING pre-check
            "minLength" => new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD,
                DiagnosticLevel.Error,
                path,
                errorMessage),
            "if" or "then" or "allOf" => null, // Structural keywords — real errors surface in nested details
            _ => new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_INVALID_TYPE,
                DiagnosticLevel.Error,
                path,
                errorMessage)
        };
    }

    private static string ExtractKeywordFromEvalPath(string evalPath)
    {
        // The eval path looks like "/additionalProperties/unknownTopLevel"
        // Extract the first keyword after root
        if (string.IsNullOrEmpty(evalPath)) return "";
        var segments = evalPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        return segments.Length > 0 ? segments[0] : "";
    }

    private static string GetParentPath(string path)
    {
        var lastSlash = path.LastIndexOf('/');
        return lastSlash <= 0 ? "/" : path[..lastSlash];
    }

    private static string GetLastSegment(string path)
    {
        var lastSlash = path.LastIndexOf('/');
        return lastSlash < 0 ? path : path[(lastSlash + 1)..];
    }

    private static SchemaDiagnostic ClassifyRequiredError(string message, string path, JsonElement root)
    {
        // Check if this is a per-kind properties.required violation
        if (path.Contains("/properties", StringComparison.Ordinal) ||
            IsPerKindPropertiesRequired(path, root))
        {
            return new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING,
                DiagnosticLevel.Error,
                path,
                message);
        }

        return new SchemaDiagnostic(
            SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_MISSING_REQUIRED_FIELD,
            DiagnosticLevel.Error,
            path,
            message);
    }

    private static SchemaDiagnostic ClassifyEnumError(string path, string message, JsonElement root)
    {
        // ElementKind discriminator
        if (path.EndsWith("/kind", StringComparison.Ordinal) && path.Contains("/elements/", StringComparison.Ordinal))
        {
            var kindValue = TryGetValueAtPath(root, path);
            return new SchemaDiagnostic(
                SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_DISCRIMINATOR_INVALID,
                DiagnosticLevel.Error,
                path,
                $"Element kind '{kindValue}' is not a valid ElementKind value");
        }

        return new SchemaDiagnostic(
            SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_INVALID_ENUM_VALUE,
            DiagnosticLevel.Error,
            path,
            message);
    }

    private static bool IsPerKindPropertiesRequired(string path, JsonElement root)
    {
        // Pattern: /elements/N — check if this is an element-level required that's
        // actually about the 'properties' dict being required for a kind that needs it
        if (!path.StartsWith("/elements/", StringComparison.Ordinal))
            return false;

        // Extract element index
        var segments = path.Split('/');
        if (segments.Length < 3)
            return false;

        if (!int.TryParse(segments[2], out var idx))
            return false;

        // Check if the element has a kind that requires specific properties
        if (root.TryGetProperty("elements", out var elements) &&
            elements.ValueKind == JsonValueKind.Array &&
            idx < elements.GetArrayLength())
        {
            var element = elements[idx];
            if (element.TryGetProperty("kind", out var kind) && kind.ValueKind == JsonValueKind.String)
            {
                var kindStr = kind.GetString();
                return kindStr is "Endpoint" or "Topic" or "Ingress";
            }
        }

        return false;
    }

    private static string? TryGetValueAtPath(JsonElement root, string jsonPointer)
    {
        var segments = jsonPointer.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var current = root;

        foreach (var segment in segments)
        {
            if (current.ValueKind == JsonValueKind.Array && int.TryParse(segment, out var idx))
            {
                if (idx < current.GetArrayLength())
                    current = current[idx];
                else
                    return null;
            }
            else if (current.ValueKind == JsonValueKind.Object && current.TryGetProperty(segment, out var prop))
            {
                current = prop;
            }
            else
            {
                return null;
            }
        }

        return current.ValueKind == JsonValueKind.String ? current.GetString() : current.GetRawText();
    }

    private static List<SchemaDiagnostic> ValidateReferences(JsonElement root)
    {
        var diagnostics = new List<SchemaDiagnostic>();

        if (!root.TryGetProperty("elements", out var elements) || elements.ValueKind != JsonValueKind.Array)
            return diagnostics;

        // Collect element IDs and check for duplicates
        var elementIds = new HashSet<string>(StringComparer.Ordinal);
        for (var i = 0; i < elements.GetArrayLength(); i++)
        {
            var elem = elements[i];
            if (elem.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.String)
            {
                var id = idProp.GetString()!;
                if (!elementIds.Add(id))
                {
                    diagnostics.Add(new SchemaDiagnostic(
                        SnapshotDiagnosticCodes.SNAPSHOT_REF_DUPLICATE_ID,
                        DiagnosticLevel.Error,
                        $"/elements/{i}/id",
                        $"Duplicate element id '{id}'"));
                }
            }
        }

        // Check relationship references
        if (root.TryGetProperty("relationships", out var relationships) && relationships.ValueKind == JsonValueKind.Array)
        {
            for (var i = 0; i < relationships.GetArrayLength(); i++)
            {
                var rel = relationships[i];

                if (rel.TryGetProperty("sourceId", out var srcId) && srcId.ValueKind == JsonValueKind.String)
                {
                    var src = srcId.GetString()!;
                    if (!elementIds.Contains(src))
                    {
                        diagnostics.Add(new SchemaDiagnostic(
                            SnapshotDiagnosticCodes.SNAPSHOT_REF_UNRESOLVED,
                            DiagnosticLevel.Error,
                            $"/relationships/{i}/sourceId",
                            $"Relationship source '{src}' not found in elements"));
                    }
                }

                if (rel.TryGetProperty("targetId", out var tgtId) && tgtId.ValueKind == JsonValueKind.String)
                {
                    var tgt = tgtId.GetString()!;
                    if (!elementIds.Contains(tgt))
                    {
                        diagnostics.Add(new SchemaDiagnostic(
                            SnapshotDiagnosticCodes.SNAPSHOT_REF_UNRESOLVED,
                            DiagnosticLevel.Error,
                            $"/relationships/{i}/targetId",
                            $"Relationship target '{tgt}' not found in elements"));
                    }
                }
            }
        }

        return diagnostics;
    }

    private static List<SchemaDiagnostic> DeduplicateDiagnostics(List<SchemaDiagnostic> diagnostics)
    {
        // Remove duplicates that share same code+path (can happen with allOf/if/then)
        var seen = new HashSet<(string Code, string Path)>();
        var result = new List<SchemaDiagnostic>();

        foreach (var d in diagnostics)
        {
            if (seen.Add((d.Code, d.Path)))
                result.Add(d);
        }

        return result;
    }

    private static bool TryParseSemver(string version, out int major, out int minor, out int patch)
    {
        major = minor = patch = 0;
        var parts = version.Split('.');
        if (parts.Length != 3) return false;
        return int.TryParse(parts[0], out major) &&
               int.TryParse(parts[1], out minor) &&
               int.TryParse(parts[2], out patch);
    }

    private static JsonSchema LoadEmbeddedSchema()
    {
        var assembly = typeof(JsonSchemaValidator).Assembly;
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("schema.json", StringComparison.Ordinal))
            ?? throw new InvalidOperationException("Embedded schema.json not found");

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Cannot load embedded resource '{resourceName}'");

        using var reader = new StreamReader(stream);
        var schemaText = reader.ReadToEnd();
        return JsonSchema.FromText(schemaText);
    }
}
