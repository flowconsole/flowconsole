using FlowConsole.Cli.Diff;

namespace FlowConsole.Cli.Formatters;

/// <summary>
/// Formats snapshot diff results for CLI output.
/// </summary>
internal interface IDiffFormatter
{
    string Format(DiffResult diff, string? onlyFilter);
}
