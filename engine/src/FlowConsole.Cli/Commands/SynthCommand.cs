using System.ComponentModel;
using System.Text.Json;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Serialization;
using FlowConsole.Cli.Settings;
using FlowConsole.Cli.Synth;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class SynthSettings : GlobalSettings
{
    [CommandOption("--cwd <DIR>")]
    [Description("Working directory for synth command (default: directory containing .flowconsole.yaml)")]
    public string? Cwd { get; init; }

    [CommandOption("--command <CMD>")]
    [Description("Override synth.command from config (for ad-hoc runs)")]
    public string? Command { get; init; }

    [CommandOption("-o|--output <PATH>")]
    [Description("Output path (default: .flowconsole/snapshots/latest.json)")]
    public string? Output { get; init; }

    [CommandOption("--diff-against-live")]
    [Description("Fetch current snapshot from backend and render diff")]
    public bool DiffAgainstLive { get; init; }

    [CommandOption("--require-confirm")]
    [Description("Require confirmation after diff before proceeding (requires --diff-against-live)")]
    public bool RequireConfirm { get; init; }
}

internal sealed class SynthCommand : Command<SynthSettings>
{
    private readonly AtomicFileWriter _atomicWriter;
    private readonly OutputRouter _outputRouter;
    private readonly CancellationTokenHolder _ctHolder;
    private readonly ShellOutRunner _shellRunner;
    private readonly LiveDiffFetcher _liveDiffFetcher;
    private readonly TextReader _consoleInput;

    public SynthCommand(
        AtomicFileWriter atomicWriter,
        OutputRouter outputRouter,
        CancellationTokenHolder ctHolder,
        ShellOutRunner shellRunner,
        LiveDiffFetcher? liveDiffFetcher = null,
        TextReader? consoleInput = null)
    {
        _atomicWriter = atomicWriter;
        _outputRouter = outputRouter;
        _ctHolder = ctHolder;
        _shellRunner = shellRunner;
        _liveDiffFetcher = liveDiffFetcher ?? new LiveDiffFetcher();
        _consoleInput = consoleInput ?? Console.In;
    }

    public override int Execute(CommandContext context, SynthSettings settings)
    {
        return ExecuteAsync(settings).GetAwaiter().GetResult();
    }

    private async Task<int> ExecuteAsync(SynthSettings settings)
    {
        var ct = _ctHolder.Token;

        if (settings.RequireConfirm && !settings.DiffAgainstLive)
        {
            CliConsole.Error("--require-confirm requires --diff-against-live.");
            return 2;
        }

        var configFile = settings.ConfigPath ?? ConfigDiscovery.FindConfigFile(Directory.GetCurrentDirectory());
        var configDir = configFile is not null ? Path.GetDirectoryName(Path.GetFullPath(configFile))! : Directory.GetCurrentDirectory();

        ConfigDiscovery.SynthConfig? synthConfig = null;
        if (configFile is not null)
            synthConfig = ConfigDiscovery.ReadSynthConfig(configFile);

        // Resolve command: CLI flag > config > error with hint
        var command = settings.Command ?? synthConfig?.Command;

        // Resolve working directory: CLI flag > config > config file directory
        var cwd = settings.Cwd is not null
            ? Path.GetFullPath(settings.Cwd)
            : synthConfig?.Cwd is not null
                ? Path.GetFullPath(Path.Combine(configDir, synthConfig.Cwd))
                : configDir;

        if (command is null)
        {
            var hint = EntrypointDetector.SuggestSynthCommand(cwd);
            CliConsole.Error("synth.command not configured in .flowconsole.yaml and --command not provided.");
            CliConsole.Info("");
            CliConsole.Info("Add to your .flowconsole.yaml:");
            CliConsole.Info("");
            CliConsole.Info("  synth:");
            CliConsole.Info($"    {hint}");
            CliConsole.Info("");
            CliConsole.Info("Or use: fcon synth --command \"<your-command>\"");
            CliConsole.Info("");
            CliConsole.Info("See https://flowconsole.tech/docs/sdk/synth for details.");
            return 2;
        }

        if (!Directory.Exists(cwd))
        {
            CliConsole.Error($"working directory does not exist: {cwd}");
            return 2;
        }

        if (settings.Verbose)
            CliConsole.Info($"Running: {command} (in {cwd})");

        int exitCode;
        string stdout;

        try
        {
            (exitCode, stdout) = await _shellRunner.RunAsync(command, cwd, ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            CliConsole.Info("Synth cancelled.");
            return 130;
        }

        if (exitCode == -1)
        {
            CliConsole.Error("synth command output exceeded 10 MB limit.");
            return 3;
        }

        if (exitCode != 0)
        {
            CliConsole.Error($"synth command exited with code {exitCode}.");
            return 3;
        }

        if (string.IsNullOrWhiteSpace(stdout))
        {
            CliConsole.Error("synth command produced no output.");
            return 3;
        }

        string normalized;
        try
        {
            normalized = SnapshotSerializer.Normalize(stdout);
        }
        catch (Exception ex)
        {
            CliConsole.Error($"synth output is not valid JSON: {ex.Message}");
            return 3;
        }

        var defaultOutputPath = Path.Combine(configDir, ".flowconsole", "snapshots", "latest.json");

        try
        {
            var outputPath = await _outputRouter.RouteAsync(
                normalized,
                settings.Output,
                "snapshots",
                "json",
                $"Synthesized snapshot written to {settings.Output ?? defaultOutputPath}",
                ct).ConfigureAwait(false);

            if (settings.Verbose && outputPath is not null)
                CliConsole.Info($"Output: {outputPath}");
        }
        catch (OperationCanceledException)
        {
            CliConsole.Info("Synth cancelled during output write.");
            return 130;
        }

        if (settings.DiffAgainstLive)
        {
            var apiUrl = configFile is not null
                ? ConfigDiscovery.ReadTopLevelValue(configFile, "api_url")
                : null;
            var modelId = configFile is not null
                ? ConfigDiscovery.ReadTopLevelValue(configFile, "model_id")
                : null;

            if (string.IsNullOrEmpty(apiUrl))
            {
                CliConsole.Error("api_url not configured in .flowconsole.yaml (required for --diff-against-live).");
                return 2;
            }

            if (string.IsNullOrEmpty(modelId))
            {
                CliConsole.Error("model_id not configured in .flowconsole.yaml (required for --diff-against-live).");
                return 2;
            }

            if (settings.Verbose)
                CliConsole.Info($"Fetching live snapshot from {apiUrl} (model: {modelId})...");

            LiveDiffFetcher.FetchResult fetchResult;
            try
            {
                fetchResult = await _liveDiffFetcher.FetchSnapshotAsync(apiUrl, modelId, ct).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                CliConsole.Info("Diff cancelled.");
                return 130;
            }

            if (!fetchResult.Success)
            {
                CliConsole.Error($"{fetchResult.ErrorMessage}");
                return 4;
            }

            using var localDoc = JsonDocument.Parse(normalized);
            var diff = FlowDiffRenderer.ComputeDiff(localDoc, fetchResult.Snapshot!);
            var useColor = !settings.NoColor && !Console.IsOutputRedirected;
            FlowDiffRenderer.Render(diff, Console.Out, useColor);

            fetchResult.Snapshot!.Dispose();

            if (settings.RequireConfirm)
            {
                if (FlowDiffRenderer.IsEmpty(diff))
                {
                    Console.Out.WriteLine("No changes to confirm.");
                    return 0;
                }

                Console.Out.Write("Apply? [y/N] ");
                Console.Out.Flush();
                var response = _consoleInput.ReadLine()?.Trim().ToLowerInvariant();
                if (response != "y" && response != "yes")
                {
                    return 0;
                }
            }
        }

        return 0;
    }
}
