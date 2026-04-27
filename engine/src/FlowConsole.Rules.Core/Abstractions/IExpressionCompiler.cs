using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Diagnostics;

namespace FlowConsole.Rules.Core.Abstractions;

/// <summary>
/// Compiles a rule expression string into an opaque compiled representation.
/// The compiled handle is stored in <see cref="FlowConsoleExpression.Compiled"/>.
/// </summary>
public interface IExpressionCompiler
{
    /// <summary>
    /// Compiles a single expression.
    /// </summary>
    /// <param name="source">The expression source text.</param>
    /// <param name="availableBindings">
    /// Map of binding name to its type descriptor (used for compile-time type checking).
    /// </param>
    /// <returns>
    /// On success: compiled expression with <see cref="FlowConsoleExpression.Compiled"/> set.
    /// On failure: diagnostics list is non-empty, Compiled may be null.
    /// </returns>
    ExpressionCompilationResult Compile(string source, IReadOnlyDictionary<string, Type> availableBindings);
}

/// <summary>
/// Result of compiling a single expression.
/// </summary>
public sealed record ExpressionCompilationResult(
    object? Compiled,
    IReadOnlyList<Diagnostic> Diagnostics);
