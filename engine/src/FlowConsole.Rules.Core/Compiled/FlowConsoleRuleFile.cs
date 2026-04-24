namespace FlowConsole.Rules.Core.Compiled;

/// <summary>
/// Compiled rule file ready for execution. Contains compiled expressions
/// and normalized defaults.
/// </summary>
public sealed record FlowConsoleRuleFile(
    string FilePath,
    IReadOnlyList<FlowConsoleRule> Rules,
    IReadOnlyList<Diagnostics.Diagnostic> Diagnostics);
