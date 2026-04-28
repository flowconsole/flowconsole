using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Cli.Formatters;

internal interface IFindingsFormatter
{
    string Format(RuleExecutionResult result, bool includeTrace);
}
