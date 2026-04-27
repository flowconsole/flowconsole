using System.ComponentModel;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Settings;

/// <summary>
/// Global settings shared by all CLI commands.
/// </summary>
public class GlobalSettings : CommandSettings
{
    [CommandOption("--config <PATH>")]
    [Description("Path to .flowconsole.yaml config file (default: auto-discovered)")]
    public string? ConfigPath { get; init; }

    [CommandOption("--verbose")]
    [Description("Debug logging to stderr")]
    public bool Verbose { get; init; }

    [CommandOption("--no-color")]
    [Description("Disable ANSI colors")]
    public bool NoColor { get; init; }

    [CommandOption("--no-telemetry")]
    [Description("Disable telemetry for this invocation")]
    public bool NoTelemetry { get; init; }
}
