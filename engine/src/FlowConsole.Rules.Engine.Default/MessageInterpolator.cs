using System.Reflection;
using System.Text;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Runtime message template interpolation. Evaluates ${...} expressions
/// using the current binding context and substitutes them into the template.
/// </summary>
internal sealed class MessageInterpolator
{
    private readonly IExpressionEvaluator _evaluator;

    public MessageInterpolator(IExpressionEvaluator evaluator)
    {
        _evaluator = evaluator;
    }

    public MessageInterpolationResult Interpolate(
        string templateSource,
        object? compiledTemplate,
        IReadOnlyDictionary<string, object?> bindings)
    {
        // If there's no compiled template or the template has no interpolations, try simple parsing
        if (compiledTemplate is not CompiledMessageTemplate compiled)
            return new MessageInterpolationResult(templateSource, null);

        var sb = new StringBuilder();
        foreach (var part in compiled.Parts)
        {
            if (part.IsLiteral)
            {
                sb.Append(part.Content);
            }
            else if (part.Compiled is not null)
            {
                var result = _evaluator.Evaluate(part.Compiled, bindings);
                if (result.IsSuccess)
                {
                    sb.Append(FormatValue(result.Value));
                }
                else
                {
                    // CEL evaluation failed — fall back to simple property resolution
                    var fallback = SimpleResolve(part.Content, bindings);
                    sb.Append(fallback ?? $"${{{part.Content}}}");
                }
            }
            else
            {
                // No compiled expression (CEL compilation failed at ingest) —
                // fall back to simple property resolution at runtime
                var fallback = SimpleResolve(part.Content, bindings);
                sb.Append(fallback ?? $"${{{part.Content}}}");
            }
        }

        return new MessageInterpolationResult(sb.ToString(), null);
    }

    /// <summary>
    /// Resolves a simple expression (binding name or dotted property access)
    /// against the current bindings. Used as fallback when CEL compilation
    /// fails (e.g. due to type-checker false positives on dynamic bindings).
    /// </summary>
    private static string? SimpleResolve(string expr, IReadOnlyDictionary<string, object?> bindings)
    {
        var trimmed = expr.Trim();

        // Direct binding lookup
        if (bindings.TryGetValue(trimmed, out var directValue))
            return FormatValue(directValue);

        // Dotted property access: e.g. "item.name" → bindings["item"].Name
        var dotIdx = trimmed.IndexOf('.');
        if (dotIdx > 0)
        {
            var root = trimmed[..dotIdx];
            var prop = trimmed[(dotIdx + 1)..];
            if (bindings.TryGetValue(root, out var obj) && obj is not null)
            {
                var propInfo = obj.GetType().GetProperty(prop,
                    BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                if (propInfo is not null)
                    return FormatValue(propInfo.GetValue(obj));
            }
        }

        return null;
    }

    private static string FormatValue(object? value)
    {
        if (value is null)
            return "null";

        if (value is IReadOnlyList<object?> list)
            return $"[{string.Join(", ", list.Select(FormatValue))}]";

        return value.ToString() ?? "null";
    }
}

internal sealed record MessageInterpolationResult(string Message, RuleExecutionError? Error);
