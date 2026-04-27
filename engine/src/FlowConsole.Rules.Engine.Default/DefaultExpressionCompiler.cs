using Cel;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Diagnostics;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Wraps Cel.NET to compile rule expressions.
/// Cel.NET types do not leak outside this project — the compiled handle
/// stored in FlowConsoleExpression.Compiled is an opaque object.
/// </summary>
internal sealed class DefaultExpressionCompiler : IExpressionCompiler
{
    private readonly HelperRegistry _helperCatalog;

    public DefaultExpressionCompiler(HelperRegistry helperCatalog)
    {
        _helperCatalog = helperCatalog;
    }

    public ExpressionCompilationResult Compile(string source, IReadOnlyDictionary<string, Type> availableBindings)
    {
        var diagnostics = new List<Diagnostic>();

        // Phase 1: Whitelist check — reject forbidden constructs before parsing
        var whitelistDiags = ExpressionWhitelist.Check(source, "");
        diagnostics.AddRange(whitelistDiags);

        if (diagnostics.Count > 0)
            return new ExpressionCompilationResult(null, diagnostics);

        try
        {
            // Phase 2: Create Cel.NET environment with type declarations
            var env = CelTypeAdapter.CreateEnv(availableBindings, _helperCatalog);

            // Phase 3: Compile (parse + type-check)
            var result = env.Compile(source);

            if (result.HasIssues())
            {
                // Map Cel.NET errors to our diagnostic codes
                var issues = result.Issues;
                if (issues != null)
                {
                    foreach (var error in issues.Errors)
                    {
                        var code = ClassifyCelError(error.Message);
                        diagnostics.Add(new Diagnostic
                        {
                            Code = code,
                            Phase = DiagnosticPhase.Expression,
                            Level = DiagnosticLevel.Error,
                            Path = "",
                            Message = error.Message,
                            RuleId = null
                        });
                    }
                }

                if (diagnostics.Count == 0)
                {
                    diagnostics.Add(new Diagnostic
                    {
                        Code = DiagnosticCodes.RF_EXPR_COMPILE_ERROR,
                        Phase = DiagnosticPhase.Expression,
                        Level = DiagnosticLevel.Error,
                        Path = "",
                        Message = $"Expression compilation failed: {result.Issues}",
                        RuleId = null
                    });
                }

                return new ExpressionCompilationResult(null, diagnostics);
            }

            // Phase 4: Create the compiled handle
            var ast = result.Ast;
            if (ast == null)
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_EXPR_COMPILE_ERROR,
                    Phase = DiagnosticPhase.Expression,
                    Level = DiagnosticLevel.Error,
                    Path = "",
                    Message = "Expression compilation produced no AST",
                    RuleId = null
                });
                return new ExpressionCompilationResult(null, diagnostics);
            }

            var compiled = new CompiledCelExpression(ast, env);
            return new ExpressionCompilationResult(compiled, diagnostics);
        }
        catch (Exception ex)
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_EXPR_COMPILE_ERROR,
                Phase = DiagnosticPhase.Expression,
                Level = DiagnosticLevel.Error,
                Path = "",
                Message = $"Expression compilation failed: {ex.Message}",
                RuleId = null
            });
            return new ExpressionCompilationResult(null, diagnostics);
        }
    }

    private static string ClassifyCelError(string errorMessage)
    {
        var msg = errorMessage.ToLowerInvariant();

        if (msg.Contains("undeclared reference") || msg.Contains("undeclared variable") ||
            msg.Contains("unknown variable") || msg.Contains("undefined name"))
            return DiagnosticCodes.RF_EXPR_UNKNOWN_BINDING;

        if (msg.Contains("undeclared function") || msg.Contains("unknown function") ||
            msg.Contains("found no matching overload"))
            return DiagnosticCodes.RF_EXPR_UNKNOWN_HELPER;

        if (msg.Contains("type mismatch") || msg.Contains("expected type") ||
            msg.Contains("incompatible type"))
            return DiagnosticCodes.RF_EXPR_TYPE_MISMATCH;

        if (msg.Contains("no matching overload") || msg.Contains("signature"))
            return DiagnosticCodes.RF_EXPR_SIGNATURE_MISMATCH;

        return DiagnosticCodes.RF_EXPR_COMPILE_ERROR;
    }
}

/// <summary>
/// Internal compiled expression handle. Stores the Cel.NET Ast and Env
/// needed for evaluation. This type never leaves Engine.Default.
/// </summary>
internal sealed record CompiledCelExpression(Ast Ast, Env Env);
