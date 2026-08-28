using System.ComponentModel;
using FlowConsole.Cli.Settings;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class WatchSettings : GlobalSettings
{
    [CommandArgument(0, "[path]")]
    [Description("Directory containing .flowconsole.yaml, config path, or build working directory (default: current directory)")]
    public string? Path { get; init; }

    [CommandOption("--command <CMD>")]
    [Description("Build command override (default: build.command from .flowconsole.yaml)")]
    public string? Command { get; init; }

    [CommandOption("--cwd <DIR>")]
    [Description("Build working directory override (default: build.cwd from config or config directory)")]
    public string? Cwd { get; init; }

    [CommandOption("--port <PORT>")]
    [Description("Explicit viewer port to bind (default: auto-select ephemeral)")]
    public int? Port { get; init; }

    [CommandOption("--no-open")]
    [Description("Do not open the browser automatically")]
    public bool NoOpen { get; init; }

    [CommandOption("--debounce-ms <MS>")]
    [Description("Source-change debounce window in milliseconds (default: 200)")]
    [DefaultValue(200)]
    public int DebounceMs { get; init; } = 200;

    [CommandOption("--max-snapshot-bytes <BYTES>")]
    [Description("Maximum snapshot file size in bytes (default: 200MB)")]
    public long MaxSnapshotBytes { get; init; } = 200 * 1024 * 1024;
}
