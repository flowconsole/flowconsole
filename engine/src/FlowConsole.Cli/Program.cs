using System.Diagnostics;
using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Http;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Synth;
using FlowConsole.Cli.Telemetry;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Engine.Default;
using FlowConsole.Scanners.Core;
using FlowConsole.Schema.SnapshotValidation;
using Microsoft.Extensions.DependencyInjection;
using Spectre.Console.Cli;

// Set up cancellation for SIGINT handling
var ct = CancellationHandler.Setup();

// Check for --version flag before Spectre processes args
if (args.Length == 1 && args[0] is "--version" or "-v")
{
    Console.WriteLine(VersionCommand.GetVersion());
    return 0;
}

// Handle --no-color before Spectre initializes (it checks NO_COLOR env var)
if (args.Any(a => a == "--no-color"))
    Environment.SetEnvironmentVariable("NO_COLOR", "1");

// Build DI container
var services = new ServiceCollection();

// Scanners: CLI always uses NoOpAdjudicator (no LLM available offline)
services.AddSingleton<IAdjudicator, NoOpAdjudicator>();
services.AddSingleton<FlowConsole.Scanners.Core.ICodeParser>(sp =>
    new FlowConsole.Scanners.CSharp.CSharpCodeParser(sp.GetRequiredService<IAdjudicator>()));

// Schema validation
services.AddSingleton<IJsonSchemaValidator, JsonSchemaValidator>();

// Rule engine: expression compiler, evaluator, helpers, built-in rule loader
services.AddSingleton<HelperRegistry>();
services.AddSingleton<IHelperCatalog>(sp => sp.GetRequiredService<HelperRegistry>());
services.AddSingleton<IExpressionCompiler>(sp =>
    new DefaultExpressionCompiler(sp.GetRequiredService<HelperRegistry>()));
services.AddSingleton<IExpressionEvaluator, DefaultExpressionEvaluator>();
services.AddSingleton<BuiltInRuleLoader>(sp =>
    new BuiltInRuleLoader(
        sp.GetRequiredService<IExpressionCompiler>(),
        sp.GetRequiredService<IHelperCatalog>()));

// CLI infrastructure
services.AddSingleton<AtomicFileWriter>();
services.AddSingleton<OutputRouter>();
services.AddSingleton<ShellOutRunner>();
// CancellationToken is a struct — wrap in a holder for DI
services.AddSingleton(new CancellationTokenHolder(ct));

// HTTP client for push commands
services.AddHttpClient("FlowConsole");
// HTTP client for PostHog telemetry (separate named client)
services.AddHttpClient("PostHog");

// API client for push commands (PushSnapshotCommand, PushFindingsCommand)
services.AddSingleton<FlowConsoleApiClient>();

// Telemetry
services.AddSingleton<TelemetryState>();
services.AddSingleton<TelemetryClient>();

var registrar = new TypeRegistrar(services);
var app = new CommandApp(registrar);

app.Configure(config =>
{
    config.SetApplicationName("fc");
    config.SetApplicationVersion(VersionCommand.GetVersion());

    // DX commands (Task 12)
    config.AddCommand<InitCommand>("init")
        .WithDescription("Scaffold a new FlowConsole project");
    config.AddCommand<DoctorCommand>("doctor")
        .WithDescription("Run health checks on the FlowConsole environment");
    config.AddCommand<CompletionCommand>("completion")
        .WithDescription("Generate shell completion scripts");

    // Scan + format commands (Task 13)
    config.AddCommand<ScanCommand>("scan")
        .WithDescription("Scan source code and generate ModelSnapshot JSON");
    config.AddCommand<FmtCommand>("fmt")
        .WithDescription("Format and normalize a ModelSnapshot JSON file");

    // Validate command (Task 14)
    config.AddCommand<ValidateCommand>("validate")
        .WithDescription("Validate a ModelSnapshot against rules");

    // Rules branch with subcommands (Task 14)
    config.AddBranch("rules", rules =>
    {
        rules.SetDescription("Manage validation rules");
        rules.AddCommand<RulesListCommand>("list")
            .WithDescription("List available rules");
        rules.AddCommand<RulesExportCommand>("export")
            .WithDescription("Export built-in rules to a directory");
    });

    // Synth command (SDK forward-engineering)
    config.AddCommand<SynthCommand>("synth")
        .WithDescription("Run SDK toolchain and produce a ModelSnapshot");

    // Explain command (Task 14)
    config.AddCommand<ExplainCommand>("explain")
        .WithDescription("Explain a rule or finding trace");

    // Push commands (Phase 3)
    config.AddBranch("push", push =>
    {
        push.SetDescription("Push data to FlowConsole server. " +
            "Concurrency: last-writer-wins; same-source pushes serialize via Postgres row locks; " +
            "different-source pushes parallel; stale-CI-overwrites-fresh possible. " +
            "Secrets only via FLOWCONSOLE_API_KEY env; --api-key flag refused. " +
            "Exit codes: 0=success, 2=usage error, 4=network/auth, 5=internal.");
        push.AddCommand<PushSnapshotCommand>("snapshot")
            .WithDescription("Push a ModelSnapshot to the FlowConsole backend. " +
                "Per-source split: mixed-source snapshots are automatically split by source field " +
                "and pushed as separate partitions. " +
                "Auth via FLOWCONSOLE_API_KEY env (PAT or JWT). " +
                "Retries with exponential backoff (3 attempts); circuit breaker on 3 consecutive 5xx.");
        push.AddCommand<PushFindingsCommand>("findings")
            .WithDescription("Push validation findings to the FlowConsole backend");
    });

    // Diff command (Phase 3) — offline local comparison
    config.AddCommand<DiffCommand>("diff")
        .WithDescription("Compare two ModelSnapshot JSON files and show differences");

    // Telemetry commands (Phase 3)
    config.AddBranch("telemetry", telemetry =>
    {
        telemetry.SetDescription("Manage anonymous usage telemetry");
        telemetry.AddCommand<TelemetryOnCommand>("on")
            .WithDescription("Enable anonymous usage telemetry");
        telemetry.AddCommand<TelemetryOffCommand>("off")
            .WithDescription("Disable anonymous usage telemetry");
        telemetry.AddCommand<TelemetryStatusCommand>("status")
            .WithDescription("Show telemetry status and endpoint");
    });
});

// Resolve telemetry services for pre/post hooks.
var bootstrapProvider = services.BuildServiceProvider();
var telemetryState = bootstrapProvider.GetRequiredService<TelemetryState>();
var telemetryClient = bootstrapProvider.GetRequiredService<TelemetryClient>();
services.AddSingleton(telemetryState);
services.AddSingleton(telemetryClient);

var noTelemetryFlag = args.Any(a => a == "--no-telemetry");
var verbose = args.Any(a => a == "--verbose");

// Determine command name from args (first non-flag arg, or "unknown")
var commandName = ResolveCommandName(args);

// Show first-run banner before command execution (if not yet prompted)
telemetryClient.ShowBannerIfNeeded();

// Execute command and measure duration
var sw = Stopwatch.StartNew();
var exitCode = app.Run(args);
sw.Stop();

// Send telemetry with bounded wait (2s max — matches PostHog timeout)
var telemetryTask = telemetryClient.Send(commandName, exitCode, sw.ElapsedMilliseconds, noTelemetryFlag, verbose);
telemetryTask.Wait(TimeSpan.FromSeconds(2));

return exitCode;

static string ResolveCommandName(string[] args)
{
    // Allowlist approach: only emit known command tokens into telemetry.
    // This is safer than a denylist of value-taking options, which must be
    // updated every time a new --flag <VALUE> is added to any command.
    HashSet<string> knownCommands = [
        "init", "doctor", "completion", "scan", "fmt", "validate",
        "synth", "explain", "diff",
        // Branch commands (parent only — subcommands checked separately)
        "push", "telemetry", "rules"
    ];

    // Branch commands mapped to their valid subcommands.
    // This prevents cross-command mislabeling (e.g. "push status" when "status"
    // is only valid under "telemetry").
    Dictionary<string, HashSet<string>> branchCommands = new()
    {
        ["push"] = ["snapshot", "findings"],
        ["telemetry"] = ["on", "off", "status"],
        ["rules"] = ["list", "export"],
    };

    // Global flags that consume the next positional arg as a value.
    // Only global (pre-command) flags matter here — per-command flags appear
    // after the command token and are never reached.
    HashSet<string> valueTakingFlags = ["--config"];

    string? command = null;
    string? subcommand = null;
    var skipNext = false;

    foreach (var arg in args)
    {
        if (skipNext)
        {
            skipNext = false;
            continue;
        }

        if (arg.StartsWith('-'))
        {
            // If this flag takes a value, skip the next arg too
            if (command is null && valueTakingFlags.Contains(arg))
                skipNext = true;
            continue;
        }

        if (command is null)
        {
            command = knownCommands.Contains(arg) ? arg : null;
            if (command is null)
                continue; // unknown token before a known command — skip
            if (!branchCommands.ContainsKey(command))
                break; // leaf command found, done
        }
        else
        {
            // Looking for subcommand of the resolved branch command
            subcommand = branchCommands[command].Contains(arg) ? arg : null;
            break;
        }
    }

    if (command is null)
        return "unknown";

    return subcommand is not null ? $"{command} {subcommand}" : command;
}

/// <summary>
/// Wraps a CancellationToken so it can be registered in DI (value types cannot be registered directly).
/// </summary>
internal sealed record CancellationTokenHolder(CancellationToken Token);
