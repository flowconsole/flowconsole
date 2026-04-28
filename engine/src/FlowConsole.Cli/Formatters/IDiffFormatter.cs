using FlowConsole.Cli.Diff;

namespace FlowConsole.Cli.Formatters;

internal interface IDiffFormatter
{
    string Format(DiffResult diff, string? onlyFilter);
}
