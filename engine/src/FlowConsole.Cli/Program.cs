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

var services = new ServiceCollection();

// Scanners: CLI always uses NoOpAdjudicator (no LLM available offline)
services.AddSingleton<IAdjudicator, NoOpAdjudicator>();
services.AddSingleton<FlowConsole.Scanners.Core.ICodeParser>(sp =>
    new FlowConsole.Scanners.CSharp.CSharpCodeParser(sp.GetRequiredService<IAdjudicator>()));

services.AddSingleton<IJsonSchemaValidator, JsonSchemaValidator>();

services.AddSingleton<HelperRegistry>();
services.AddSingleton<IHelperCatalog>(sp => sp.GetRequiredService<HelperRegistry>());
services.AddSingleton<IExpressionCompiler>(sp =>
    new DefaultExpressionCompiler(sp.GetRequiredService<HelperRegistry>()));
services.AddSingleton<IExpressionEvaluator, DefaultExpressionEvaluator>();
services.AddSingleton<BuiltInRuleLoader>(sp =>
    new BuiltInRuleLoader(
        sp.GetRequiredService<IExpressionCompiler>(),
        sp.GetRequiredService<IHelperCatalog>()));

services.AddSingleton<AtomicFileWriter>();
services.AddSingleton<OutputRouter>();
services.AddSingleton<ShellOutRunner>();

services.AddSingleton<FlowConsole.Cli.Hosting.SnapshotDiscovery>();
services.AddSingleton<FlowConsole.Cli.Hosting.SnapshotStartupValidator>();
services.AddSingleton<FlowConsole.Cli.Hosting.BrowserLauncher>();
// CancellationToken is a struct — wrap in a holder for DI
services.AddSingleton(new CancellationTokenHolder(ct));

services.AddHttpClient("FlowConsole");
services.AddHttpClient("PostHog");

services.AddSingleton<FlowConsoleApiClient>();

services.AddSingleton<TelemetryState>();
services.AddSingleton<TelemetryClient>();

var registrar = new TypeRegistrar(services);
var app = new CommandApp(registrar);

app.Configure(config =>
{
    config.SetApplicationName("fcon");
    config.SetApplicationVersion(VersionCommand.GetVersion());

    config.AddCommand<InitCommand>("init")
        .WithDescription("Scaffold a new FlowConsole project");
    config.AddCommand<DoctorCommand>("doctor")
        .WithDescription("Run health checks on the FlowConsole environment");
    config.AddCommand<CompletionCommand>("completion")
        .WithDescription("Generate shell completion scripts");

    config.AddCommand<ScanCommand>("scan")
        .WithDescription("Scan source code and generate ModelSnapshot JSON");
    config.AddCommand<FmtCommand>("fmt")
        .WithDescription("Format and normalize a ModelSnapshot JSON file");

    config.AddCommand<ValidateCommand>("validate")
        .WithDescription("Validate a ModelSnapshot against rules");

    config.AddBranch("rules", rules =>
    {
        rules.SetDescription("Manage validation rules");
        rules.AddCommand<RulesListCommand>("list")
            .WithDescription("List available rules");
        rules.AddCommand<RulesExportCommand>("export")
            .WithDescription("Export built-in rules to a directory");
    });

    config.AddCommand<BuildCommand>("build")
        .WithDescription("Run SDK toolchain and produce a ModelSnapshot");

    config.AddCommand<ExplainCommand>("explain")
        .WithDescription("Explain a rule or finding trace");

    config.AddBranch("push", push =>
    {
        push.SetDescription("Push data to FlowConsole backend. " +
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

    config.AddCommand<DiffCommand>("diff")
        .WithDescription("Compare two ModelSnapshot JSON files and show differences");

    config.AddCommand<ViewCommand>("view")
        .WithDescription("Start a local viewer for a ModelSnapshot");

    config.AddCommand<WatchCommand>("watch")
        .WithDescription("Watch architecture sources, rebuild the snapshot on change, and live-serve the viewer on 127.0.0.1");

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

var bootstrapProvider = services.BuildServiceProvider();
var telemetryState = bootstrapProvider.GetRequiredService<TelemetryState>();
var telemetryClient = bootstrapProvider.GetRequiredService<TelemetryClient>();
services.AddSingleton(telemetryState);
services.AddSingleton(telemetryClient);

var noTelemetryFlag = args.Any(a => a == "--no-telemetry");
var verbose = args.Any(a => a == "--verbose");

var commandName = ResolveCommandName(args);


telemetryClient.ShowBannerIfNeeded(commandName, args);

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
        "build", "explain", "diff", "view",
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
            if (command is null && valueTakingFlags.Contains(arg))
                skipNext = true;
            continue;
        }

        if (command is null)
        {
            command = knownCommands.Contains(arg) ? arg : null;
            if (command is null)
                continue;
            if (!branchCommands.ContainsKey(command))
                break;
        }
        else
        {
            subcommand = branchCommands[command].Contains(arg) ? arg : null;
            break;
        }
    }

    if (command is null)
        return "unknown";

    return subcommand is not null ? $"{command} {subcommand}" : command;
}

internal sealed record CancellationTokenHolder(CancellationToken Token);
