using System.ComponentModel;
using System.Text.Json;
using System.Text.Json.Nodes;
using FlowConsole.Cli.Http;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Settings;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

/// <summary>
/// Settings for <c>fcon push snapshot</c>.
///
/// Concurrency: last-writer-wins. Same-source pushes naturally serialize via Postgres
/// row locks (no torn reads). Different-source pushes (e.g. C# and Helm) run in parallel.
/// Stale CI job can overwrite a fresher push — coordinate pipeline ordering if needed.
///
/// Per-source split: if the snapshot contains elements from multiple sources, the CLI
/// automatically splits by source and pushes each partition separately. Relationships
/// whose both ends belong to the same source are included in that partition.
///
/// Secrets: API keys accepted ONLY via FLOWCONSOLE_API_KEY env. The --api-key flag is
/// refused to prevent secrets from leaking into CI logs via ps/shell history.
///
/// Exit codes: 0=success, 2=usage error, 4=network/auth/circuit-breaker, 5=internal.
/// </summary>
internal sealed class PushSnapshotSettings : GlobalSettings
{
    [CommandArgument(0, "<snapshot>")]
    [Description("Path to ModelSnapshot JSON file")]
    public string SnapshotPath { get; init; } = string.Empty;

    [CommandOption("--model <ID>")]
    [Description("Model ID (fallback: model_id from .flowconsole.yaml)")]
    public string? ModelId { get; init; }

    [CommandOption("--api-url <URL>")]
    [Description("API base URL (fallback: FLOWCONSOLE_API_URL env, then api_url from .flowconsole.yaml)")]
    public string? ApiUrl { get; init; }

    [CommandOption("--api-key <TOKEN>")]
    [Description("REFUSED: use FLOWCONSOLE_API_KEY env instead (API keys leak into CI logs)")]
    public string? ApiKey { get; init; }

    [CommandOption("--dry-run")]
    [Description("Print request payload and exit without sending")]
    public bool DryRun { get; init; }
}

internal sealed class PushSnapshotCommand : Command<PushSnapshotSettings>
{
    private readonly FlowConsoleApiClient _apiClient;
    private readonly CancellationTokenHolder _ctHolder;

    public PushSnapshotCommand(FlowConsoleApiClient apiClient, CancellationTokenHolder ctHolder)
    {
        _apiClient = apiClient;
        _ctHolder = ctHolder;
    }

    public override int Execute(CommandContext context, PushSnapshotSettings settings)
    {
        return ExecuteAsync(settings).GetAwaiter().GetResult();
    }

    private async Task<int> ExecuteAsync(PushSnapshotSettings settings)
    {
        var ct = _ctHolder.Token;

        // Refuse --api-key on CLI args (secrets hygiene)
        if (!string.IsNullOrEmpty(settings.ApiKey))
        {
            CliConsole.Error("--api-key is refused on CLI args (API keys leak into CI logs).");
            CliConsole.Info("       Use FLOWCONSOLE_API_KEY environment variable instead.");
            return 2;
        }

        // Resolve config file for fallback values
        var configFile = settings.ConfigPath ?? ConfigDiscovery.FindConfigFile(Directory.GetCurrentDirectory());

        // Resolve model ID: CLI flag > .flowconsole.yaml > error
        var modelId = settings.ModelId
            ?? (configFile is not null ? ConfigDiscovery.ReadTopLevelValue(configFile, "model_id") : null);
        if (string.IsNullOrEmpty(modelId))
        {
            CliConsole.Error("--model is required (or set model_id in .flowconsole.yaml).");
            return 2;
        }

        // Resolve API URL: CLI flag > env > .flowconsole.yaml > error
        var apiUrl = settings.ApiUrl
            ?? Environment.GetEnvironmentVariable("FLOWCONSOLE_API_URL")
            ?? (configFile is not null ? ConfigDiscovery.ReadTopLevelValue(configFile, "api_url") : null);

        // Resolve API key from env (not required for dry-run)
        var apiKey = Environment.GetEnvironmentVariable("FLOWCONSOLE_API_KEY");

        // Dry-run only needs model ID for display; auth and API URL are optional
        if (!settings.DryRun)
        {
            if (string.IsNullOrEmpty(apiKey))
            {
                CliConsole.Error("FLOWCONSOLE_API_KEY environment variable is required for push.");
                return 2;
            }

            if (string.IsNullOrEmpty(apiUrl))
            {
                CliConsole.Error("--api-url is required (or set FLOWCONSOLE_API_URL env or api_url in .flowconsole.yaml).");
                return 2;
            }
        }

        // Read and validate snapshot file
        if (!File.Exists(settings.SnapshotPath))
        {
            CliConsole.Error($"snapshot file not found: {settings.SnapshotPath}");
            return 2;
        }

        string snapshotJson;
        try
        {
            snapshotJson = await File.ReadAllTextAsync(settings.SnapshotPath, ct).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            CliConsole.Error($"cannot read snapshot file: {ex.Message}");
            return 2;
        }

        JsonDocument snapshotDoc;
        try
        {
            snapshotDoc = JsonDocument.Parse(snapshotJson);
        }
        catch (JsonException ex)
        {
            CliConsole.Error($"invalid JSON in snapshot file: {ex.Message}");
            return 2;
        }

        // Per-source split (Decision #29): group elements by source, push once per source
        var sourcePartitions = SplitBySource(snapshotDoc);
        snapshotDoc.Dispose();

        if (sourcePartitions.Count == 0)
        {
            CliConsole.Warn("snapshot contains no elements.");
            return 0;
        }

        // Dry-run: print request payloads and exit
        if (settings.DryRun)
        {
            var displayUrl = apiUrl ?? "<not configured>";
            CliConsole.Info($"Dry run: would push {sourcePartitions.Count} source partition(s) to {displayUrl}");
            CliConsole.Info($"  Model: {modelId}");
            CliConsole.Info($"  Endpoint: PUT /api/v1/models/{modelId}/ir");
            foreach (var (source, json) in sourcePartitions)
            {
                CliConsole.Info($"\n--- Source: {source} ---");
                Console.Out.WriteLine(json);
            }
            return 0;
        }

        // Push each source partition sequentially
        var allSuccess = true;
        foreach (var (source, json) in sourcePartitions)
        {
            if (settings.Verbose)
                CliConsole.Info($"Pushing source partition: {source}...");

            FlowConsoleApiClient.PushResult result;
            try
            {
                result = await _apiClient.PushSnapshotAsync(
                    apiUrl!, modelId, json, apiKey!, settings.Verbose, ct).ConfigureAwait(false);
            }
            catch (HttpRequestException ex)
            {
                CliConsole.Error($"network error pushing source '{source}': {ex.Message}");
                return 4;
            }
            catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
            {
                CliConsole.Error($"request timed out pushing source '{source}': {ex.Message}");
                return 4;
            }

            if (result.Warnings is { Count: > 0 })
            {
                foreach (var w in result.Warnings)
                    CliConsole.Warn(w);
            }

            if (!result.Success)
            {
                CliConsole.Error($"push failed for source '{source}': {result.ErrorMessage}");
                allSuccess = false;

                // Auth/schema errors are fatal — don't continue with other partitions
                if (result.StatusCode is 401 or 403 or 422)
                    return 4;

                continue;
            }

            var versionMsg = result.ModelVersion is not null
                ? $"Model version: {result.ModelVersion}"
                : "success";
            CliConsole.Info($"Pushed [{source}]. {versionMsg}");
        }

        if (!allSuccess)
        {
            CliConsole.Error("one or more source partitions failed.");
            return 4;
        }

        // Print final receipt for last partition's model version
        var lastResult = sourcePartitions.Count == 1 ? "Pushed." : $"Pushed {sourcePartitions.Count} source partition(s).";
        CliConsole.Success(lastResult);
        return 0;
    }

    /// <summary>
    /// Splits a snapshot JSON document by the <c>source</c> field of elements.
    /// Each partition gets the same $schema/schemaVersion and only relationships
    /// whose both ends belong to the partition.
    /// </summary>
    internal static List<(string Source, string Json)> SplitBySource(JsonDocument doc)
    {
        var root = doc.RootElement;

        // Extract top-level metadata (preserve absence for backward compat with legacy payloads)
        var hasSchema = root.TryGetProperty("$schema", out var s);
        var schema = hasSchema ? s.GetRawText() : null;
        var hasSchemaVersion = root.TryGetProperty("schemaVersion", out var sv);
        var schemaVersion = hasSchemaVersion ? sv.GetRawText() : null;
        var topLevelSource = root.TryGetProperty("source", out var ts) && ts.ValueKind == JsonValueKind.String
            ? ts.GetString() : null;

        // Collect elements grouped by source
        var elementsBySource = new Dictionary<string, List<JsonElement>>(StringComparer.OrdinalIgnoreCase);

        if (root.TryGetProperty("elements", out var elements) && elements.ValueKind == JsonValueKind.Array)
        {
            foreach (var elem in elements.EnumerateArray())
            {
                var elemSource = elem.TryGetProperty("source", out var es) && es.ValueKind == JsonValueKind.String
                    ? es.GetString() ?? topLevelSource ?? "CodeScan"
                    : topLevelSource ?? "CodeScan";

                if (!elementsBySource.TryGetValue(elemSource, out var list))
                {
                    list = [];
                    elementsBySource[elemSource] = list;
                }
                list.Add(elem);

            }
        }

        // If only one source, return the original JSON as-is (no re-serialization overhead)
        if (elementsBySource.Count <= 1)
        {
            var singleSource = elementsBySource.Keys.FirstOrDefault() ?? topLevelSource ?? "CodeScan";
            return [(singleSource, doc.RootElement.GetRawText())];
        }

        // Collect relationships
        var relationships = new List<JsonElement>();
        if (root.TryGetProperty("relationships", out var rels) && rels.ValueKind == JsonValueKind.Array)
        {
            foreach (var rel in rels.EnumerateArray())
                relationships.Add(rel);
        }

        // Collect flows
        JsonElement? flowsElement = null;
        if (root.TryGetProperty("flows", out var flows) && flows.ValueKind == JsonValueKind.Array)
            flowsElement = flows;

        // Build per-source sub-snapshots
        var result = new List<(string, string)>();
        foreach (var (source, elems) in elementsBySource.OrderBy(kv => kv.Key, StringComparer.Ordinal))
        {
            var sourceElementIds = new HashSet<string>(StringComparer.Ordinal);
            foreach (var elem in elems)
            {
                if (elem.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String)
                    sourceElementIds.Add(id.GetString()!);
            }

            // Filter relationships: both source and target must be in this partition
            var partitionRels = relationships.Where(r =>
            {
                var srcId = r.TryGetProperty("sourceId", out var si) ? si.GetString() : null;
                var tgtId = r.TryGetProperty("targetId", out var ti) ? ti.GetString() : null;
                return srcId is not null && tgtId is not null &&
                       sourceElementIds.Contains(srcId) && sourceElementIds.Contains(tgtId);
            }).ToList();

            var obj = new JsonObject();

            // Only include $schema/schemaVersion if they were present in the original
            // (legacy payloads without these fields must stay legacy to avoid backend 422)
            if (schema is not null)
                obj["$schema"] = JsonNode.Parse(schema);
            if (schemaVersion is not null)
                obj["schemaVersion"] = JsonNode.Parse(schemaVersion);

            obj["source"] = source;
            obj["elements"] = new JsonArray(elems.Select(e => JsonNode.Parse(e.GetRawText())!).ToArray());
            obj["relationships"] = new JsonArray(partitionRels.Select(r => JsonNode.Parse(r.GetRawText())!).ToArray());

            // Include flows only in first partition (flows are model-level, not source-scoped)
            if (flowsElement is not null && result.Count == 0)
                obj["flows"] = JsonNode.Parse(flowsElement.Value.GetRawText());

            result.Add((source, obj.ToJsonString(new JsonSerializerOptions { WriteIndented = false })));
        }

        return result;
    }
}
