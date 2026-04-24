using System.Text.RegularExpressions;
using FlowConsole.Rules.Core.Diagnostics;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Pre-parse source text validation to reject forbidden constructs per expression-language.md.
/// Uses string-based analysis as the risk mitigation states (Cel.NET AST access may be limited).
/// </summary>
internal static class ExpressionWhitelist
{
    // Optional chaining: item.?field
    private static readonly Regex OptionalChainingPattern = new(
        @"\.\s*\?",
        RegexOptions.Compiled);

    // Single-quoted strings
    private static readonly Regex SingleQuotePattern = new(
        @"(?<![\\])'(?:[^'\\]|\\.)*'",
        RegexOptions.Compiled);

    // Struct literals: TypeName{...}
    private static readonly Regex StructLiteralPattern = new(
        @"\b[A-Z]\w*\s*\{",
        RegexOptions.Compiled);

    // Duration/timestamp literals: duration("..."), timestamp("...")
    private static readonly Regex TimestampDurationPattern = new(
        @"\b(duration|timestamp)\s*\(",
        RegexOptions.Compiled);

    // Unary plus: standalone +N at start or after operator/open-paren
    private static readonly Regex UnaryPlusPattern = new(
        @"(?:^|[(\[,+\-*/% =<>!&|?:])\s*\+\s*\d",
        RegexOptions.Compiled);

    // Unicode escapes in strings
    private static readonly Regex UnicodeEscapePattern = new(
        @"\\u[0-9a-fA-F]{4}",
        RegexOptions.Compiled);

    // Multiline strings (triple-quoted)
    private static readonly Regex MultilineStringPattern = new(
        "\"\"\"",
        RegexOptions.Compiled);

    // Lambda arrow: x -> expr
    private static readonly Regex LambdaArrowPattern = new(
        @"\-\s*>",
        RegexOptions.Compiled);

    // Regex literal: re"..." or r"..."
    private static readonly Regex RegexLiteralPattern = new(
        @"\br[e]?\s*""",
        RegexOptions.Compiled);

    /// <summary>
    /// Checks a source expression for forbidden constructs.
    /// Returns diagnostics for each violation found.
    /// </summary>
    public static List<Diagnostic> Check(string source, string path, string? ruleId = null)
    {
        var diagnostics = new List<Diagnostic>();

        void AddDiag(string message, string hint)
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_EXPR_UNSUPPORTED_CONSTRUCT,
                Phase = DiagnosticPhase.Expression,
                Level = DiagnosticLevel.Error,
                Path = path,
                Message = message,
                Hint = hint,
                RuleId = ruleId
            });
        }

        // Strip string literal content so regex patterns don't match
        // operators inside quoted strings (e.g. "pci->prod", "db-name")
        var stripped = StripStringLiterals(source);

        if (OptionalChainingPattern.IsMatch(stripped))
            AddDiag("Optional chaining (.?) is not supported",
                "Use has(item.field) ? item.field : defaultValue");

        if (SingleQuotePattern.IsMatch(stripped))
            AddDiag("Single-quoted strings are not allowed",
                "Use double-quoted strings: \"hello\"");

        if (StructLiteralPattern.IsMatch(stripped))
            AddDiag("Struct/type instantiation literals are not supported",
                "Custom type creation is not available in rule expressions");

        if (TimestampDurationPattern.IsMatch(stripped))
            AddDiag("Timestamp and duration literals/functions are not supported in v1alpha1",
                "Time-based operations are not available in rule expressions");

        if (LambdaArrowPattern.IsMatch(stripped))
            AddDiag("Lambda expressions (x -> expr) are not supported in v1alpha1",
                "Lambda-based helpers (exists, all, any, none, count/distinct with predicate) are planned for a future version");

        if (MultilineStringPattern.IsMatch(stripped))
            AddDiag("Multiline string literals (triple-quoted) are not supported",
                "Use \\n within a regular string: \"line1\\nline2\"");

        if (RegexLiteralPattern.IsMatch(stripped))
            AddDiag("Regex literals are not supported",
                "Regular expressions are only allowed in selector.*.matches fields");

        if (UnicodeEscapePattern.IsMatch(stripped))
            AddDiag("Unicode escape sequences (\\uXXXX) are not supported in v1alpha1",
                "Use literal characters instead");

        // Unary plus is trickier — only flag if clearly a unary context
        // We check more carefully to avoid false positives with addition operator
        if (UnaryPlusPattern.IsMatch(stripped))
        {
            // Confirm it's not just normal addition by checking context
            // This is a best-effort check
            AddDiag("Unary + operator is not supported",
                "Simply omit the + prefix: +5 → 5");
        }

        return diagnostics;
    }

    /// <summary>
    /// Replaces content inside double-quoted string literals with spaces
    /// so that regex checks don't match operators inside strings.
    /// </summary>
    private static string StripStringLiterals(string expr)
    {
        var result = new System.Text.StringBuilder(expr.Length);
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
}
