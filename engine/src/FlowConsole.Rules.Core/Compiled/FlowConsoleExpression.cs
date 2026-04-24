using FlowConsole.Rules.Core.Diagnostics;

namespace FlowConsole.Rules.Core.Compiled;

/// <summary>
/// A compiled expression. The Compiled field holds an opaque handle
/// to the underlying expression engine's compiled representation.
/// </summary>
public sealed record FlowConsoleExpression(
    string Source,
    SourceRange? SourceRange,
    object? Compiled);
