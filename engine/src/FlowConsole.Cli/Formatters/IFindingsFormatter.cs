using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Cli.Formatters;

/// <summary>
/// Formats rule execution results for CLI output.
/// </summary>
internal interface IFindingsFormatter
{
    string Format(RuleExecutionResult result, bool includeTrace);
}
