using System.Text;
using System.Text.RegularExpressions;
using FlowConsole.Rules.Core.Diagnostics;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Parses ${...} interpolations in message templates.
/// Validates that only allowed constructs appear inside interpolations:
/// property access, index access, let-variables, simple function calls.
/// No lambdas, arithmetic, comparisons, or conditionals.
/// </summary>
internal static class MessageTemplateCompiler
{
    // Match ${...} interpolations, handling nested braces one level deep
    private static readonly Regex InterpolationPattern = new(
        @"(?<!\\)\$\{([^}]+)\}",
        RegexOptions.Compiled);

    // Lambda arrow in expression
    private static readonly Regex LambdaPattern = new(
        @"\-\s*>",
        RegexOptions.Compiled);

    // Arithmetic/comparison operators (not inside function args)
    private static readonly Regex ArithmeticPattern = new(
        @"(?<![=!<>])[+\-*/%]|[<>]=?|[!=]=|&&|\|\|",
        RegexOptions.Compiled);

    // Conditional ternary
    private static readonly Regex ConditionalPattern = new(
        @"\?",
        RegexOptions.Compiled);

    /// <summary>
    /// Parses a message template and extracts interpolation expressions.
    /// Returns diagnostics for any invalid constructs.
    /// </summary>
    public static MessageTemplateResult Parse(
        string template,
        IReadOnlySet<string> availableBindings,
        string path,
        string? ruleId = null)
    {
        var parts = new List<MessageTemplatePart>();
        var diagnostics = new List<Diagnostic>();
        var lastEnd = 0;

        foreach (Match match in InterpolationPattern.Matches(template))
        {
            // Add literal text before this interpolation
            if (match.Index > lastEnd)
            {
                var literal = template[lastEnd..match.Index];
                // Unescape \${ to ${
                literal = literal.Replace("\\${", "${").Replace("\\\\", "\\");
                parts.Add(new MessageTemplatePart(literal, IsLiteral: true));
            }

            var expr = match.Groups[1].Value.Trim();

            // Strip string literal content so regex patterns don't match
            // operators inside quoted strings (e.g. "pci-dss", "db-name")
            var stripped = StripStringLiterals(expr);

            // Validate the expression subset
            if (LambdaPattern.IsMatch(stripped))
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_EXPR_UNSUPPORTED_CONSTRUCT,
                    Phase = DiagnosticPhase.Expression,
                    Level = DiagnosticLevel.Error,
                    Path = path,
                    Message = $"Lambda expressions are not allowed in message templates: ${{{expr}}}",
                    Hint = "Use only property access, let-variables, or simple function calls",
                    RuleId = ruleId
                });
            }
            else if (ArithmeticPattern.IsMatch(stripped))
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_EXPR_UNSUPPORTED_CONSTRUCT,
                    Phase = DiagnosticPhase.Expression,
                    Level = DiagnosticLevel.Error,
                    Path = path,
                    Message = $"Arithmetic and comparison operators are not allowed in message templates: ${{{expr}}}",
                    Hint = "Compute values in let-variables and reference them: ${{myVar}}",
                    RuleId = ruleId
                });
            }
            else if (ConditionalPattern.IsMatch(stripped))
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_EXPR_UNSUPPORTED_CONSTRUCT,
                    Phase = DiagnosticPhase.Expression,
                    Level = DiagnosticLevel.Error,
                    Path = path,
                    Message = $"Conditional expressions are not allowed in message templates: ${{{expr}}}",
                    Hint = "Compute values in let-variables and reference them: ${{myVar}}",
                    RuleId = ruleId
                });
            }

            // Check for unknown bindings in the expression
            // Extract the root identifier (first identifier before . or [ or ()
            var rootIdentifier = ExtractRootIdentifier(expr);
            if (rootIdentifier != null && !availableBindings.Contains(rootIdentifier))
            {
                // Check if it's a function call — functions are OK
                var isFunctionCall = expr.TrimStart().StartsWith(rootIdentifier) &&
                                     expr.Contains('(');
                if (!isFunctionCall)
                {
                    diagnostics.Add(new Diagnostic
                    {
                        Code = DiagnosticCodes.RF_EXPR_MESSAGE_UNKNOWN_BINDING,
                        Phase = DiagnosticPhase.Expression,
                        Level = DiagnosticLevel.Error,
                        Path = path,
                        Message = $"Unknown binding '{rootIdentifier}' in message template",
                        Hint = "Available bindings depend on the rule's kind, target, and mode",
                        RuleId = ruleId
                    });
                }
            }

            parts.Add(new MessageTemplatePart(expr, IsLiteral: false));
            lastEnd = match.Index + match.Length;
        }

        // Add trailing literal
        if (lastEnd < template.Length)
        {
            var literal = template[lastEnd..];
            literal = literal.Replace("\\${", "${").Replace("\\\\", "\\");
            parts.Add(new MessageTemplatePart(literal, IsLiteral: true));
        }

        return new MessageTemplateResult(parts, diagnostics);
    }

    /// <summary>
    /// Replaces content inside double-quoted string literals with spaces
    /// so that regex checks don't match operators inside strings.
    /// Handles escaped quotes (\").
    /// </summary>
    private static string StripStringLiterals(string expr)
    {
        var result = new StringBuilder(expr.Length);
        var i = 0;
        while (i < expr.Length)
        {
            if (expr[i] == '"')
            {
                result.Append('"');
                i++;
                while (i < expr.Length)
                {
                    if (expr[i] == '\\' && i + 1 < expr.Length)
                    {
                        result.Append(' ');
                        result.Append(' ');
                        i += 2;
                    }
                    else if (expr[i] == '"')
                    {
                        result.Append('"');
                        i++;
                        break;
                    }
                    else
                    {
                        result.Append(' ');
                        i++;
                    }
                }
            }
            else
            {
                result.Append(expr[i]);
                i++;
            }
        }
        return result.ToString();
    }

    private static string? ExtractRootIdentifier(string expr)
    {
        var trimmed = expr.Trim();
        var sb = new StringBuilder();
        foreach (var c in trimmed)
        {
            if (char.IsLetterOrDigit(c) || c == '_')
                sb.Append(c);
            else
                break;
        }
        var id = sb.ToString();
        return id.Length > 0 ? id : null;
    }
}

internal sealed record MessageTemplatePart(string Content, bool IsLiteral);
internal sealed record MessageTemplateResult(
    IReadOnlyList<MessageTemplatePart> Parts,
    IReadOnlyList<Diagnostic> Diagnostics);
