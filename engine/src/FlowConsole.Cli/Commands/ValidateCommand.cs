using System.ComponentModel;
using System.Text.Json;
using FlowConsole.Cli.Formatters;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Serialization;
using FlowConsole.Cli.Settings;
using FlowConsole.Cli.Watch;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Execution;
using FlowConsole.Rules.Core.Ingest;
using FlowConsole.Rules.Engine.Default;
using FlowConsole.Snapshots.Mapping;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class ValidateSettings : GlobalSettings
{
    [CommandArgument(0, "[model-snapshot]")]
    [Description("Path to ModelSnapshot JSON (default: .flowconsole/snapshots/latest.json). Use '-' for stdin")]
    public string? Snapshot { get; init; }

    [CommandArgument(1, "[rules-dir]")]
    [Description("Path to rules directory (default: from .flowconsole.yaml rules_dir or ./rules/)")]
    public string? RulesDir { get; init; }

    [CommandOption("--format <FORMAT>")]
    [Description("Output format: human, json, sarif, junit (default: human)")]
    public string Format { get; init; } = "human";

    [CommandOption("--severity <LEVEL>")]
    [Description("Filter findings by minimum severity: info, warning, error, critical")]
    public string? Severity { get; init; }

    [CommandOption("--fail-on <LEVEL>")]
    [Description("Exit 1 if findings at this severity or above: info, warning, error (default: error)")]
    public string FailOn { get; init; } = "error";

    [CommandOption("-o|--output <PATH>")]
    [Description("Write output to file instead of stdout")]
    public string? Output { get; init; }

    [CommandOption("--target <TARGET>")]
    [Description("Rule target filter: model, actual, diff")]
    public string? Target { get; init; }

    [CommandOption("--watch")]
    [Description("Watch mode: re-run on file change (incompatible with stdin '-')")]
    public bool Watch { get; init; }

    [CommandOption("--include-trace")]
    [Description("Include expression and bindings trace in findings output")]
    public bool IncludeTrace { get; init; }
}

internal sealed class ValidateCommand : Command<ValidateSettings>
{
    private readonly IExpressionCompiler _expressionCompiler;
    private readonly IExpressionEvaluator _evaluator;
    private readonly IHelperCatalog _helperCatalog;
    private readonly BuiltInRuleLoader _builtInRuleLoader;
    private readonly CancellationTokenHolder _ctHolder;
    private readonly AtomicFileWriter _atomicWriter;

    public ValidateCommand(
        IExpressionCompiler expressionCompiler,
        IExpressionEvaluator evaluator,
        IHelperCatalog helperCatalog,
        BuiltInRuleLoader builtInRuleLoader,
        CancellationTokenHolder ctHolder,
        AtomicFileWriter? atomicWriter = null)
    {
        _expressionCompiler = expressionCompiler;
        _evaluator = evaluator;
        _helperCatalog = helperCatalog;
        _builtInRuleLoader = builtInRuleLoader;
        _ctHolder = ctHolder;
        _atomicWriter = atomicWriter ?? new AtomicFileWriter();
    }

    public override int Execute(CommandContext context, ValidateSettings settings)
    {
        return ExecuteAsync(settings).GetAwaiter().GetResult();
    }

    private async Task<int> ExecuteAsync(ValidateSettings settings)
    {
        var ct = _ctHolder.Token;

        // Validate --fail-on value
        if (!SharedHelpers.IsValidSeverity(settings.FailOn))
        {
            Console.Error.WriteLine($"error: unrecognized --fail-on value '{settings.FailOn}'. Valid: info, warning, error, critical");
            return 2;
        }

        // Validate --severity value
        if (settings.Severity is not null && !SharedHelpers.IsValidSeverity(settings.Severity))
        {
            Console.Error.WriteLine($"error: unrecognized --severity value '{settings.Severity}'. Valid: info, warning, error, critical");
            return 2;
        }

        // Watch mode incompatible with stdin
        if (settings.Watch && settings.Snapshot == "-")
        {
            Console.Error.WriteLine("error: --watch is incompatible with stdin input '-'");
            return 2;
        }

        // Resolve snapshot path
        var snapshotPath = ResolveSnapshotPath(settings.Snapshot);
        if (snapshotPath is null && settings.Snapshot != "-")
        {
            Console.Error.WriteLine("error: snapshot not found. Run `fc scan` first or pass path explicitly.");
            return 2;
        }

        // Resolve rules directory
        var rulesDir = ResolveRulesDir(settings.RulesDir, settings.ConfigPath);

        if (settings.Watch)
        {
            var runner = new WatchRunner(
                snapshotPath!,
                rulesDir,
                () => RunValidation(snapshotPath!, rulesDir, settings, ct),
                ct);

            using (runner)
            {
                return await runner.RunAsync().ConfigureAwait(false);
            }
        }

        return await RunValidation(
            settings.Snapshot == "-" ? null : snapshotPath,
            rulesDir,
            settings,
            ct).ConfigureAwait(false);
    }

    private async Task<int> RunValidation(
        string? snapshotPath,
        string rulesDir,
        ValidateSettings settings,
        CancellationToken ct)
    {
        // Read snapshot
        string snapshotJson;
        if (settings.Snapshot == "-")
        {
            snapshotJson = await Console.In.ReadToEndAsync(ct).ConfigureAwait(false);
        }
        else if (snapshotPath is not null && File.Exists(snapshotPath))
        {
            snapshotJson = await File.ReadAllTextAsync(snapshotPath, ct).ConfigureAwait(false);
        }
        else
        {
            Console.Error.WriteLine("error: snapshot file not found");
            return 2;
        }

        // Parse snapshot
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(snapshotJson);
        }
        catch (JsonException ex)
        {
            Console.Error.WriteLine($"error: invalid JSON in snapshot: {ex.Message}");
            return 2;
        }

        FlowConsole.Core.Entities.ModelSnapshot snapshot;
        using (doc)
        {
            snapshot = SnapshotDeserializer.Deserialize(doc);
        }

        // Map to rule engine bindings
        List<FlowConsole.Rules.Core.Bindings.ElementRef> elements;
        List<FlowConsole.Rules.Core.Bindings.RelationshipRef> relationships;
        try
        {
            (elements, relationships) = ModelSnapshotMapper.Map(snapshot);
        }
        catch (NotSupportedException ex)
        {
            Console.Error.WriteLine($"error: {ex.Message}");
            return 2;
        }

        // Ingest rule files
        var pipeline = new IngestPipeline(_expressionCompiler, _helperCatalog);
        var (ruleFiles, hasIngestErrors) = LoadRuleFiles(rulesDir, pipeline);

        if (ruleFiles is null)
        {
            // Use built-in rules only
            var builtIn = _builtInRuleLoader.GetBuiltInRules();
            if (builtIn is null || builtIn.Rules.Count == 0)
            {
                Console.Error.WriteLine("warning: no rules found (no rules directory and no built-in rules available)");
                return 0;
            }
            ruleFiles = builtIn;
        }
        else
        {
            // If any user rule file failed to parse, exit with error code 2 per exit code contract
            if (hasIngestErrors)
            {
                Console.Error.WriteLine(ruleFiles.Rules.Count == 0
                    ? "error: all rule files failed to parse"
                    : "error: one or more rule files failed to parse");
                return 2;
            }
            // Merge with built-in rules
            ruleFiles = _builtInRuleLoader.MergeWithBuiltIn(ruleFiles);
        }

        // Apply --target filter
        if (settings.Target is not null)
        {
            if (!Enum.TryParse<FlowConsole.Rules.Core.Model.RuleTarget>(settings.Target, ignoreCase: true, out var targetFilter))
            {
                Console.Error.WriteLine($"error: unrecognized --target value '{settings.Target}'. Valid: model, actual, diff");
                return 2;
            }
            ruleFiles = new FlowConsoleRuleFile(
                ruleFiles.FilePath,
                ruleFiles.Rules.Where(r => r.Target == targetFilter).ToList(),
                ruleFiles.Diagnostics);
        }

        // Execute rules
        var subjectResolver = new InMemorySubjectResolver(elements, relationships, null, _evaluator);
        var pathFinder = new InMemoryPathFinder(elements, relationships, _evaluator);
        var executor = new DefaultRuleExecutor(subjectResolver, pathFinder, _evaluator);

        var result = executor.Execute(ruleFiles);

        // Apply severity filter
        if (settings.Severity is not null)
        {
            var minSeverity = SharedHelpers.SeverityOrder(settings.Severity);
            result = result with
            {
                Findings = result.Findings
                    .Where(f => SharedHelpers.SeverityOrder(f.Severity) >= minSeverity)
                    .ToList()
            };
        }

        // Format output
        IFindingsFormatter formatter;
        try
        {
            formatter = GetFormatter(settings.Format);
        }
        catch (ArgumentException ex)
        {
            Console.Error.WriteLine($"error: {ex.Message}");
            return 2;
        }
        var output = formatter.Format(result, settings.IncludeTrace);

        // Write output
        if (settings.Output is not null)
        {
            await _atomicWriter.WriteAsync(settings.Output, output, ct).ConfigureAwait(false);
        }
        else
        {
            Console.Write(output);
        }

        // Determine exit code
        var failOnLevel = SharedHelpers.SeverityOrder(settings.FailOn);
        var hasFailingFindings = result.Findings.Any(f => SharedHelpers.SeverityOrder(f.Severity) >= failOnLevel);

        return hasFailingFindings ? 1 : 0;
    }

    private (FlowConsoleRuleFile? RuleFile, bool HasIngestErrors) LoadRuleFiles(string rulesDir, IngestPipeline pipeline)
    {
        if (!Directory.Exists(rulesDir))
            return (null, false);

        var ruleFilePaths = Directory.GetFiles(rulesDir, "*.rule.yaml", SearchOption.AllDirectories)
            .Concat(Directory.GetFiles(rulesDir, "*.rule.yml", SearchOption.AllDirectories))
            .Concat(Directory.GetFiles(rulesDir, "*.rule.json", SearchOption.AllDirectories))
            .OrderBy(p => p)
            .ToList();

        if (ruleFilePaths.Count == 0)
            return (null, false);

        var allRules = new List<FlowConsoleRule>();
        var allDiagnostics = new List<FlowConsole.Rules.Core.Diagnostics.Diagnostic>();
        var hasIngestErrors = false;

        foreach (var filePath in ruleFilePaths)
        {
            var content = File.ReadAllText(filePath);
            var result = pipeline.RunFull(content, filePath);

            allDiagnostics.AddRange(result.Diagnostics);

            if (result.RuleFile is not null)
                allRules.AddRange(result.RuleFile.Rules);
            else
            {
                hasIngestErrors = true;
                foreach (var diag in result.Diagnostics.Where(d => d.Level == FlowConsole.Rules.Core.Diagnostics.DiagnosticLevel.Error))
                    Console.Error.WriteLine($"error: [{diag.Code}] {diag.Message} ({filePath})");
            }
        }

        return (new FlowConsoleRuleFile("<merged>", allRules, allDiagnostics), hasIngestErrors);
    }

    private static string? ResolveSnapshotPath(string? explicit_path)
    {
        if (explicit_path is not null && explicit_path != "-")
        {
            return File.Exists(explicit_path) ? Path.GetFullPath(explicit_path) : null;
        }

        // Default: .flowconsole/snapshots/latest.json
        var defaultPath = Path.Combine(".flowconsole", "snapshots", "latest.json");
        return File.Exists(defaultPath) ? Path.GetFullPath(defaultPath) : null;
    }

    private static string ResolveRulesDir(string? explicit_dir, string? configPath)
    {
        var configFile = configPath ?? ConfigDiscovery.FindConfigFile(Directory.GetCurrentDirectory());
        return SharedHelpers.ResolveRulesDir(explicit_dir, configFile);
    }

    private static IFindingsFormatter GetFormatter(string format)
    {
        return format.ToLowerInvariant() switch
        {
            "human" => new HumanFormatter(),
            "json" => new JsonFormatter(),
            "sarif" => new SarifFormatter(),
            "junit" => new JunitFormatter(),
            _ => throw new ArgumentException($"Unknown format '{format}'. Valid formats: human, json, sarif, junit.")
        };
    }

}
