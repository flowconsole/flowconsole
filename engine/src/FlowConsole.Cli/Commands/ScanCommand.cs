using System.ComponentModel;
using System.Text.Json;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Scanners;
using FlowConsole.Cli.Serialization;
using FlowConsole.Cli.Settings;
using FlowConsole.Scanners.Core;
using FlowConsole.Schema.SnapshotValidation;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class ScanSettings : GlobalSettings
{
    [CommandArgument(0, "<input>")]
    [Description("Path to scan: directory, .sln, .slnx, .csproj, .cs file, or ModelSnapshot .json")]
    public string Input { get; init; } = string.Empty;

    [CommandOption("-o|--output <PATH>")]
    [Description("Output path (default: stdout if piped, .flowconsole/snapshots/latest.json if TTY)")]
    public string? Output { get; init; }

    [CommandOption("--scanner <NAME>")]
    [Description("Force scanner: csharp, helm (default: auto-detect)")]
    public string? Scanner { get; init; }

    [CommandOption("--merge-with <PATH>")]
    [Description("Merge scan output with an existing snapshot JSON file")]
    public string? MergeWith { get; init; }

    [CommandOption("--strict")]
    [Description("Strict mode: abort on first parse error (exit 3)")]
    public bool Strict { get; init; }
}

internal sealed class ScanCommand : Command<ScanSettings>
{
    private readonly ICodeParser _parser;
    private readonly IJsonSchemaValidator _schemaValidator;
    private readonly OutputRouter _outputRouter;
    private readonly CancellationTokenHolder _ctHolder;

    public ScanCommand(
        ICodeParser parser,
        IJsonSchemaValidator schemaValidator,
        OutputRouter outputRouter,
        CancellationTokenHolder ctHolder)
    {
        _parser = parser;
        _schemaValidator = schemaValidator;
        _outputRouter = outputRouter;
        _ctHolder = ctHolder;
    }

    public override int Execute(CommandContext context, ScanSettings settings)
    {
        return ExecuteAsync(settings).GetAwaiter().GetResult();
    }

    private async Task<int> ExecuteAsync(ScanSettings settings)
    {
        var ct = _ctHolder.Token;

        var csharpAdapter = new CSharpScannerAdapter(_parser);
        var helmAdapter = new HelmScannerAdapter();
        var dispatcher = new ScannerDispatcher(csharpAdapter, helmAdapter);

        DispatchResult result;
        try
        {
            result = await dispatcher.DispatchAsync(
                settings.Input,
                settings.Scanner,
                settings.MergeWith,
                settings.Strict,
                ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            CliConsole.Info("Scan cancelled.");
            return 130;
        }

        // Write warnings/errors to stderr
        foreach (var diag in result.Diagnostics)
        {
            if (diag.Severity == ScanDiagnosticSeverity.Error)
                CliConsole.Error($"[{diag.Code}] {diag.Message}{(diag.FilePath is not null ? $" ({diag.FilePath})" : "")}");
            else if (diag.Severity == ScanDiagnosticSeverity.Warning)
                CliConsole.Warn($"[{diag.Code}] {diag.Message}{(diag.FilePath is not null ? $" ({diag.FilePath})" : "")}");
        }

        if (result.IsIdentityMode)
            return 0;

        if (!result.Success)
            return result.ExitCode;

        var snapshot = result.Snapshot!;

        var json = SnapshotSerializer.Serialize(snapshot);

        // Validate output through IJsonSchemaValidator before emit.
        // Per-kind property errors (e.g. Endpoint without httpMethod) are downgraded to
        // warnings for scan output — the scanner may not populate all per-kind fields.
        // Critical structural errors ($schema/$schemaVersion missing, invalid types) still block.
        using var doc = JsonDocument.Parse(json);
        var validationResult = _schemaValidator.Validate(doc);
        if (validationResult.IsSuccess)
        {
            var criticalErrors = validationResult.Value
                .Where(d => d.Level == DiagnosticLevel.Error &&
                            d.Code != SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING)
                .ToList();

            var kindWarnings = validationResult.Value
                .Where(d => d.Code == SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING)
                .ToList();

            foreach (var w in kindWarnings)
                CliConsole.Warn($"[{w.Code}] {w.Message} (at {w.Path})");

            if (criticalErrors.Count > 0)
            {
                CliConsole.Error("Internal error: scan output failed schema validation:");
                foreach (var err in criticalErrors)
                    CliConsole.Info($"  [{err.Code}] {err.Message} (at {err.Path})");
                return 5;
            }
        }
        else
        {
            CliConsole.Warn("schema validation unavailable, output may contain errors");
        }

        var summary = $"Scanned {result.FilesScanned} source(s): {snapshot.Elements.Count} elements, {snapshot.Relationships.Count} relationships";
        if (result.FilesSkipped > 0)
            summary += $" ({result.FilesSkipped} skipped)";

        try
        {
            var outputPath = await _outputRouter.RouteAsync(
                json,
                settings.Output,
                "snapshots",
                "json",
                humanSummary: null,
                ct).ConfigureAwait(false);

            if (!Console.IsOutputRedirected)
            {
                CliConsole.Success(summary);
                if (outputPath is not null)
                    CliConsole.Detail($"written {outputPath}");
            }
        }
        catch (OperationCanceledException)
        {
            CliConsole.Info("Scan cancelled during output write.");
            return 130;
        }

        return 0;
    }
}
