using System.ComponentModel;
using System.Text.Json;
using FlowConsole.Cli.Http;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Settings;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class PushFindingsSettings : GlobalSettings
{
    [CommandArgument(0, "<findings>")]
    [Description("Path to findings JSON file")]
    public string FindingsPath { get; init; } = string.Empty;

    [CommandOption("--model <ID>")]
    [Description("Model ID (fallback: model_id from .flowconsole.yaml)")]
    public string? ModelId { get; init; }

    [CommandOption("--api-url <URL>")]
    [Description("API base URL (fallback: FLOWCONSOLE_API_URL env, then api_url from .flowconsole.yaml)")]
    public string? ApiUrl { get; init; }

    [CommandOption("--api-key <TOKEN>")]
    [Description("REFUSED: use FLOWCONSOLE_API_KEY env instead (API keys leak into CI logs)")]
    public string? ApiKey { get; init; }

    [CommandOption("--commit-sha <SHA>")]
    [Description("Git commit SHA for metadata")]
    public string? CommitSha { get; init; }

    [CommandOption("--branch <NAME>")]
    [Description("Git branch name for metadata")]
    public string? Branch { get; init; }

    [CommandOption("--pipeline-url <URL>")]
    [Description("CI pipeline URL for metadata")]
    public string? PipelineUrl { get; init; }

    [CommandOption("--source <TYPE>")]
    [Description("Source type: push|pull_request|schedule|manual")]
    public string? Source { get; init; }

    [CommandOption("--dry-run")]
    [Description("Print request payload and exit without sending")]
    public bool DryRun { get; init; }
}

internal sealed class PushFindingsCommand : Command<PushFindingsSettings>
{
    private static readonly HashSet<string> ValidSources = new(StringComparer.OrdinalIgnoreCase)
    {
        "push", "pull_request", "schedule", "manual"
    };

    private readonly FlowConsoleApiClient _apiClient;
    private readonly CancellationTokenHolder _ctHolder;

    public PushFindingsCommand(FlowConsoleApiClient apiClient, CancellationTokenHolder ctHolder)
    {
        _apiClient = apiClient;
        _ctHolder = ctHolder;
    }

    public override int Execute(CommandContext context, PushFindingsSettings settings)
    {
        return ExecuteAsync(settings).GetAwaiter().GetResult();
    }

    private async Task<int> ExecuteAsync(PushFindingsSettings settings)
    {
        var ct = _ctHolder.Token;

        // Refuse --api-key on CLI args (secrets hygiene)
        if (!string.IsNullOrEmpty(settings.ApiKey))
        {
            CliConsole.Error("--api-key is refused on CLI args (API keys leak into CI logs).");
            CliConsole.Info("       Use FLOWCONSOLE_API_KEY environment variable instead.");
            return 2;
        }

        if (settings.Source is not null && !ValidSources.Contains(settings.Source))
        {
            CliConsole.Error($"--source must be one of: push, pull_request, schedule, manual (got '{settings.Source}').");
            return 2;
        }

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

        if (!File.Exists(settings.FindingsPath))
        {
            CliConsole.Error($"findings file not found: {settings.FindingsPath}");
            return 2;
        }

        string findingsFileContent;
        try
        {
            findingsFileContent = await File.ReadAllTextAsync(settings.FindingsPath, ct).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            CliConsole.Error($"cannot read findings file: {ex.Message}");
            return 2;
        }

        string requestJson;
        try
        {
            requestJson = BuildRequestBody(findingsFileContent, settings);
        }
        catch (JsonException ex)
        {
            CliConsole.Error($"invalid JSON in findings file: {ex.Message}");
            return 2;
        }

        if (settings.DryRun)
        {
            var displayUrl = apiUrl ?? "<not configured>";
            CliConsole.Info($"Dry run: would push findings to {displayUrl}");
            CliConsole.Info($"  Model: {modelId}");
            CliConsole.Info($"  Endpoint: POST /api/v1/models/{modelId}/validation-runs");
            Console.Out.WriteLine(requestJson);
            return 0;
        }

        if (settings.Verbose)
            CliConsole.Info($"Pushing findings to {apiUrl}/api/v1/models/{modelId}/validation-runs...");

        FlowConsoleApiClient.FindingsPushResult result;
        try
        {
            result = await _apiClient.PushFindingsAsync(
                apiUrl!, modelId, requestJson, apiKey!, settings.Verbose, ct).ConfigureAwait(false);
        }
        catch (HttpRequestException ex)
        {
            CliConsole.Error($"network error pushing findings: {ex.Message}");
            return 4;
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            CliConsole.Error($"request timed out pushing findings: {ex.Message}");
            return 4;
        }

        if (!result.Success)
        {
            CliConsole.Error($"push findings failed: {result.ErrorMessage}");
            return 4;
        }

        var idMsg = result.ValidationRunId is not null
            ? $"Validation run ID: {result.ValidationRunId}"
            : "success";
        CliConsole.Success($"Findings pushed. {idMsg}");
        return 0;
    }

    internal static string BuildRequestBody(string findingsFileContent, PushFindingsSettings settings)
    {
        using var doc = JsonDocument.Parse(findingsFileContent);
        var root = doc.RootElement;

        // Support two formats:
        // 1. Full request body: { "findings": [...], "driftScore": ..., ... }
        // 2. Just the findings array: [{ "ruleId": ..., ... }, ...]
        JsonElement findingsArray;
        decimal? driftScore = null;
        int? totalRules = null;
        DateTimeOffset? executedAt = null;

        if (root.ValueKind == JsonValueKind.Array)
        {
            findingsArray = root;
        }
        else if (root.ValueKind == JsonValueKind.Object)
        {
            if (root.TryGetProperty("findings", out var f) && f.ValueKind == JsonValueKind.Array)
                findingsArray = f;
            else
                throw new JsonException("Expected 'findings' array in request body.");

            if (root.TryGetProperty("driftScore", out var ds) && ds.ValueKind == JsonValueKind.Number)
                driftScore = ds.GetDecimal();
            if (root.TryGetProperty("totalRules", out var tr) && tr.ValueKind == JsonValueKind.Number)
                totalRules = tr.GetInt32();
            if (root.TryGetProperty("executedAt", out var ea) && ea.ValueKind == JsonValueKind.String)
            {
                if (DateTimeOffset.TryParse(ea.GetString(), out var parsed))
                    executedAt = parsed;
            }
        }
        else
        {
            throw new JsonException("Findings file must be a JSON array or object with 'findings' array.");
        }

        // Build request body with CLI metadata taking precedence over file values
        using var ms = new System.IO.MemoryStream();
        using var writer = new Utf8JsonWriter(ms);
        writer.WriteStartObject();

        writer.WritePropertyName("findings");
        findingsArray.WriteTo(writer);

        if (totalRules is not null)
        {
            writer.WriteNumber("totalRules", totalRules.Value);
        }

        if (driftScore is not null)
        {
            writer.WriteNumber("driftScore", driftScore.Value);
        }

        // CLI metadata (--source, --commit-sha, etc.) override file values
        if (settings.Source is not null)
            writer.WriteString("source", settings.Source);
        else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("source", out var srcProp) && srcProp.ValueKind == JsonValueKind.String)
            writer.WriteString("source", srcProp.GetString());

        if (settings.CommitSha is not null)
            writer.WriteString("commitSha", settings.CommitSha);
        else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("commitSha", out var csProp) && csProp.ValueKind == JsonValueKind.String)
            writer.WriteString("commitSha", csProp.GetString());

        if (settings.Branch is not null)
            writer.WriteString("branch", settings.Branch);
        else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("branch", out var brProp) && brProp.ValueKind == JsonValueKind.String)
            writer.WriteString("branch", brProp.GetString());

        if (settings.PipelineUrl is not null)
            writer.WriteString("pipelineUrl", settings.PipelineUrl);
        else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("pipelineUrl", out var puProp) && puProp.ValueKind == JsonValueKind.String)
            writer.WriteString("pipelineUrl", puProp.GetString());

        if (executedAt is not null)
            writer.WriteString("executedAt", executedAt.Value.ToString("O"));

        writer.WriteEndObject();
        writer.Flush();

        return System.Text.Encoding.UTF8.GetString(ms.ToArray());
    }
}
