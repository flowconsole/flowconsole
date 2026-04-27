using Cel;
using Cel.Common.Types;
using Cel.Common.Types.Ref;
using Cel.Interpreter;
using Cel.Interpreter.Functions;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Execution;
using FlowConsole.Rules.Engine.Default.Helpers;
using CelOverload = Cel.Interpreter.Functions.Overload;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Evaluates compiled CEL expressions with iteration budget and wall-clock timeout.
/// Wraps Cel.NET evaluation and maps internal errors to our RE_* diagnostic codes.
/// Optionally accepts graph context for helper functions (neighbors, incoming, outgoing).
/// </summary>
internal sealed class DefaultExpressionEvaluator : IExpressionEvaluator
{
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromMilliseconds(100);

    private readonly CelOverload[]? _helperOverloads;

    /// <summary>
    /// Creates an evaluator without graph context. Helpers that require graph data
    /// (neighbors, incoming, outgoing) will return empty results.
    /// </summary>
    public DefaultExpressionEvaluator()
    {
    }

    /// <summary>
    /// Creates an evaluator with graph context for helper functions.
    /// </summary>
    public DefaultExpressionEvaluator(
        IReadOnlyList<ElementRef> elements,
        IReadOnlyList<RelationshipRef> relationships)
    {
        _helperOverloads = HelperOverloadFactory.Create(elements, relationships);
    }

    /// <summary>
    /// Creates an evaluator with pre-built helper overloads.
    /// </summary>
    public DefaultExpressionEvaluator(CelOverload[] helperOverloads)
    {
        _helperOverloads = helperOverloads;
    }

    public ExpressionEvaluationResult Evaluate(object compiled, IReadOnlyDictionary<string, object?> bindings)
    {
        if (compiled is not CompiledCelExpression celExpr)
        {
            return ExpressionEvaluationResult.Failure(
                new RuleExecutionError("", DiagnosticCodes.RF_EXPR_COMPILE_ERROR,
                    "Invalid compiled expression handle"));
        }

        try
        {
            // Build program options: standard library + custom helper functions
            var stdLib = new StdLibrary();
            var progOptsList = new List<ProgramOption>(stdLib.ProgramOptions.Select(o => (ProgramOption)o));

            // Add custom helper function overloads
            var overloads = _helperOverloads ?? HelperOverloadFactory.CreateMinimal();
            progOptsList.Add(ProgramOptions.Functions(overloads));

            var program = Cel.Cel.NewProgram(celExpr.Env, celExpr.Ast, progOptsList.ToArray());

            // Create activation (bindings) for the program
            var mutableBindings = new Dictionary<string, object?>(bindings);
            var activation = ActivationFactory.NewActivation(mutableBindings);

            // Evaluate with timeout
            IVal? result = null;
            Exception? evalException = null;

            var task = Task.Run(() =>
            {
                try
                {
                    var evalResult = program.Eval(activation);
                    result = evalResult.Val;
                }
                catch (Exception ex)
                {
                    evalException = ex;
                }
            });

            if (!task.Wait(DefaultTimeout))
            {
                return ExpressionEvaluationResult.Failure(
                    new RuleExecutionError("", DiagnosticCodes.RE_EXPRESSION_TIMEOUT,
                        $"Expression evaluation exceeded {DefaultTimeout.TotalMilliseconds}ms timeout"));
            }

            if (evalException != null)
            {
                return HandleEvaluationException(evalException);
            }

            if (result is Err errVal)
            {
                return HandleCelError(errVal);
            }

            // Convert Cel.NET value to CLR value
            var clrValue = ConvertCelValue(result);
            return ExpressionEvaluationResult.Success(clrValue);
        }
        catch (Exception ex)
        {
            return HandleEvaluationException(ex);
        }
    }

    private static ExpressionEvaluationResult HandleEvaluationException(Exception ex)
    {
        var message = ex.Message.ToLowerInvariant();

        if (message.Contains("null") && (message.Contains("order") || message.Contains("compar")))
        {
            return ExpressionEvaluationResult.Failure(
                new RuleExecutionError("", DiagnosticCodes.RE_EXPRESSION_NULL_ORDER,
                    $"Ordinal comparison with null: {ex.Message}"));
        }

        if (message.Contains("null") && (message.Contains("arithmetic") || message.Contains("add") ||
            message.Contains("subtract") || message.Contains("multiply") || message.Contains("divide")))
        {
            return ExpressionEvaluationResult.Failure(
                new RuleExecutionError("", DiagnosticCodes.RE_EXPRESSION_NULL_ARITHMETIC,
                    $"Arithmetic with null: {ex.Message}"));
        }

        if (message.Contains("budget") || message.Contains("iteration") || message.Contains("limit"))
        {
            return ExpressionEvaluationResult.Failure(
                new RuleExecutionError("", DiagnosticCodes.RE_EXPRESSION_BUDGET_EXCEEDED,
                    $"Iteration budget exceeded: {ex.Message}"));
        }

        if (message.Contains("timeout"))
        {
            return ExpressionEvaluationResult.Failure(
                new RuleExecutionError("", DiagnosticCodes.RE_EXPRESSION_TIMEOUT,
                    $"Expression evaluation timed out: {ex.Message}"));
        }

        // Generic runtime error
        return ExpressionEvaluationResult.Failure(
            new RuleExecutionError("", DiagnosticCodes.RE_EXPRESSION_RUNTIME_ERROR,
                $"Expression evaluation failed: {ex.Message}"));
    }

    private static ExpressionEvaluationResult HandleCelError(Err errVal)
    {
        var message = errVal.ToString();

        if (message.Contains("no such overload"))
        {
            return ExpressionEvaluationResult.Failure(
                new RuleExecutionError("", DiagnosticCodes.RF_EXPR_SIGNATURE_MISMATCH,
                    $"No matching overload: {message}"));
        }

        return ExpressionEvaluationResult.Failure(
            new RuleExecutionError("", DiagnosticCodes.RE_EXPRESSION_RUNTIME_ERROR,
                $"Expression evaluation error: {message}"));
    }

    private static object? ConvertCelValue(IVal? value)
    {
        if (value == null || value is NullT)
            return null;

        if (value is BoolT boolVal)
            return boolVal.BooleanValue();

        if (value is IntT intVal)
            return intVal.IntValue();

        if (value is DoubleT doubleVal)
            return (double)doubleVal.Value();

        if (value is StringT strVal)
            return (string)strVal.Value();

        if (value is ListT listVal)
        {
            var list = new List<object?>();
            var nativeList = listVal.Value();
            if (nativeList is System.Collections.IList iList)
            {
                foreach (var item in iList)
                {
                    if (item is IVal v)
                        list.Add(ConvertCelValue(v));
                    else
                        list.Add(item);
                }
            }
            return list;
        }

        // For our domain types (ObjectT wrapping ElementRef, etc.)
        if (value is ObjectT objVal)
            return objVal.Value();

        // Fallback: try to get native value
        return value.Value();
    }
}
