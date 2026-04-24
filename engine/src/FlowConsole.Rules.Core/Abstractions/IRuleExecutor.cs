using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Rules.Core.Abstractions;

/// <summary>
/// Executes a compiled rule file against model data, producing findings and errors.
/// An error in one rule does not prevent other rules from executing.
/// </summary>
public interface IRuleExecutor
{
    /// <summary>
    /// Executes all enabled rules in the compiled rule file.
    /// </summary>
    /// <param name="ruleFile">Compiled rule file (output of <see cref="IRuleFileIngestor"/>).</param>
    /// <returns>Execution result with findings, errors, and counts.</returns>
    RuleExecutionResult Execute(FlowConsoleRuleFile ruleFile);
}
