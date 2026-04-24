using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Rules.Core.Abstractions;

/// <summary>
/// Evaluates a compiled expression with the given bindings.
/// Enforces iteration budget and wall-clock timeout.
/// </summary>
public interface IExpressionEvaluator
{
    /// <summary>
    /// Evaluates a compiled expression.
    /// </summary>
    /// <param name="compiled">Opaque compiled handle from <see cref="IExpressionCompiler"/>.</param>
    /// <param name="bindings">Runtime binding values keyed by name.</param>
    /// <returns>
    /// On success: the evaluated value (bool, int, string, list, etc.).
    /// On failure: a <see cref="RuleExecutionError"/> with the appropriate RE_* code.
    /// </returns>
    ExpressionEvaluationResult Evaluate(object compiled, IReadOnlyDictionary<string, object?> bindings);
}

/// <summary>
/// Result of evaluating an expression. Exactly one of Value or Error is set.
/// </summary>
public sealed record ExpressionEvaluationResult
{
    public object? Value { get; }
    public RuleExecutionError? Error { get; }
    public bool IsSuccess => Error is null;

    private ExpressionEvaluationResult(object? value, RuleExecutionError? error)
    {
        Value = value;
        Error = error;
    }

    public static ExpressionEvaluationResult Success(object? value) => new(value, null);
    public static ExpressionEvaluationResult Failure(RuleExecutionError error) => new(null, error);
}
