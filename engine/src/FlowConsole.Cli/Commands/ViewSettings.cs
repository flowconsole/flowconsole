using System.ComponentModel;
using FlowConsole.Cli.Settings;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class ViewSettings : GlobalSettings
{
    [CommandArgument(0, "[path]")]
    [Description("Path to snapshot JSON file (default: auto-discover from .flowconsole/snapshots/)")]
    public string? Path { get; init; }

    [CommandOption("--port <PORT>")]
    [Description("Explicit port to bind (default: auto-select ephemeral)")]
    public int? Port { get; init; }

    [CommandOption("--no-open")]
    [Description("Do not open the browser automatically")]
    public bool NoOpen { get; init; }

    [CommandOption("--source <SOURCE>")]
    [Description("Filter snapshots by source: scan, synth, or auto (default: auto)")]
    public string? Source { get; init; }

    [CommandOption("--max-snapshot-bytes <BYTES>")]
    [Description("Maximum snapshot file size in bytes (default: 200MB)")]
    public long MaxSnapshotBytes { get; init; } = 200 * 1024 * 1024;
}
