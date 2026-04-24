using System.Text.RegularExpressions;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Core.Ingest;

/// <summary>
/// Phase 4: Expression compilation. Compiles all expression strings in rules
/// (selector.where, rule.where, rule.let, rule.assert, rule.message)
/// through IExpressionCompiler. Collects all errors (does not short-circuit).
/// </summary>
internal sealed class ExpressionPhase
{
    private readonly IExpressionCompiler _compiler;
    private readonly IHelperCatalog _helperCatalog;

    public ExpressionPhase(IExpressionCompiler compiler, IHelperCatalog helperCatalog)
    {
        _compiler = compiler;
        _helperCatalog = helperCatalog;
    }

    public ExpressionPhaseResult Compile(RuleFile ruleFile, string filePath)
    {
        var diagnostics = new List<Diagnostic>();
        var compiledRules = new List<CompiledRuleIntermediate>();

        for (int i = 0; i < ruleFile.Rules.Count; i++)
        {
            var rule = ruleFile.Rules[i];
            var path = $"/rules/{i}";
            var compiled = CompileRule(rule, path, diagnostics);
            compiledRules.Add(compiled);
        }

        return new ExpressionPhaseResult(compiledRules, diagnostics);
    }

    private CompiledRuleIntermediate CompileRule(Rule rule, string path, List<Diagnostic> diagnostics)
    {
        var ruleBindings = ResolveRuleBindings(rule);
        var selectorWhereBindings = ResolveSelectorWhereBindings(rule);

        // Compile selector.where expressions
        var subject = CompileSelector(rule.Subject, $"{path}/subject", selectorWhereBindings, rule.Id, diagnostics);
        var from = CompileSelector(rule.From, $"{path}/from", selectorWhereBindings, rule.Id, diagnostics);
        var to = CompileSelector(rule.To, $"{path}/to", selectorWhereBindings, rule.Id, diagnostics);
        var via = CompileSelector(rule.Via, $"{path}/via", selectorWhereBindings, rule.Id, diagnostics);

        // Compile rule.where — uses restricted bindings (only `item`)
        // because rule.where is evaluated per-item as a filter before stats/items are computed
        FlowConsoleExpression? ruleWhere = null;
        if (rule.Where != null)
        {
            var whereBindings = ResolveWhereBindings(rule);
            ruleWhere = CompileExpression(rule.Where, whereBindings, $"{path}/where", rule.Id, diagnostics);
        }

        // Compile let variables — each variable adds to bindings for subsequent ones
        IReadOnlyDictionary<string, FlowConsoleExpression>? letExpressions = null;
        if (rule.Let is { Count: > 0 })
        {
            var letDict = new Dictionary<string, FlowConsoleExpression>();
            var letBindings = new Dictionary<string, Type>(ruleBindings);

            // Check for reserved names and dependency cycles
            CheckLetReservedNames(rule.Let, path, rule.Id, diagnostics);
            CheckLetDependencyCycles(rule.Let, path, rule.Id, diagnostics);

            foreach (var (varName, expression) in rule.Let)
            {
                var compiled = CompileExpression(expression, letBindings, $"{path}/let/{varName}", rule.Id, diagnostics);
                letDict[varName] = compiled;

                // Add the let variable to bindings for subsequent expressions
                // Let variables are typed as dynamic (object) since we can't infer type at compile time
                letBindings[varName] = typeof(object);
            }

            letExpressions = letDict;
        }

        // Add let variables to rule bindings for assert/message compilation
        var assertBindings = new Dictionary<string, Type>(ruleBindings);
        if (rule.Let != null)
        {
            foreach (var varName in rule.Let.Keys)
                assertBindings[varName] = typeof(object);
        }

        // Compile assert
        var assertExpr = CompileExpression(rule.Assert, assertBindings, $"{path}/assert", rule.Id, diagnostics);

        // Compile message template
        var messageExpr = CompileMessageTemplate(rule.Message, assertBindings, $"{path}/message", rule.Id, diagnostics);

        return new CompiledRuleIntermediate
        {
            Rule = rule,
            Assert = assertExpr,
            Message = messageExpr,
            Where = ruleWhere,
            Let = letExpressions,
            Subject = subject,
            From = from,
            To = to,
            Via = via
        };
    }

    private FlowConsoleExpression CompileExpression(
        string source,
        IReadOnlyDictionary<string, Type> bindings,
        string path,
        string ruleId,
        List<Diagnostic> diagnostics)
    {
        var result = _compiler.Compile(source, bindings);

        foreach (var diag in result.Diagnostics)
        {
            diagnostics.Add(diag with { Path = path, RuleId = ruleId });
        }

        return new FlowConsoleExpression(source, null, result.Compiled);
    }

    private FlowConsoleExpression CompileMessageTemplate(
        string template,
        IReadOnlyDictionary<string, Type> bindings,
        string path,
        string ruleId,
        List<Diagnostic> diagnostics)
    {
        var bindingNames = new HashSet<string>(bindings.Keys);

        // Validate bindings in template
        var templateDiags = ValidateMessageTemplate(template, bindingNames, path, ruleId);
        diagnostics.AddRange(templateDiags);

        // Compile each ${...} interpolation as a CEL expression
        var parts = new List<CompiledMessagePart>();
        var idx = 0;

        while (idx < template.Length)
        {
            var dollarIdx = template.IndexOf("${", idx, StringComparison.Ordinal);
            if (dollarIdx < 0)
            {
                // Remaining text is literal
                if (idx < template.Length)
                    parts.Add(new CompiledMessagePart(template[idx..], true, null));
                break;
            }

            // Check for escape \${
            if (dollarIdx > 0 && template[dollarIdx - 1] == '\\')
            {
                // Literal up to and including the escaped ${
                parts.Add(new CompiledMessagePart(template[idx..(dollarIdx - 1)] + "${", true, null));
                idx = dollarIdx + 2;

                // Find closing brace and add its content as literal
                var escEnd = FindClosingBrace(template, idx);
                if (escEnd >= 0)
                {
                    parts.Add(new CompiledMessagePart(template[idx..escEnd] + "}", true, null));
                    idx = escEnd + 1;
                }
                continue;
            }

            // Add literal before ${
            if (dollarIdx > idx)
                parts.Add(new CompiledMessagePart(template[idx..dollarIdx], true, null));

            var braceStart = dollarIdx + 2;
            var braceEnd = FindClosingBrace(template, braceStart);
            if (braceEnd < 0)
            {
                // Unclosed interpolation — treat rest as literal
                parts.Add(new CompiledMessagePart(template[dollarIdx..], true, null));
                break;
            }

            var expr = template[braceStart..braceEnd].Trim();

            // Validate template expression subset: no lambda, arithmetic, or conditional
            var subsetDiags = ValidateMessageExpressionSubset(expr, path, ruleId);
            diagnostics.AddRange(subsetDiags);

            // Validate function calls against known helpers
            var fnDiags = ValidateMessageFunctionCalls(expr, path, ruleId);
            diagnostics.AddRange(fnDiags);

            // Compile the interpolation expression as CEL
            var compilationResult = _compiler.Compile(expr, bindings);

            // Don't surface CEL type-checker diagnostics for message templates —
            // CEL's static type checker reports false positives (e.g. "undefined field 'name'")
            // because it doesn't know the runtime shape of dynamic bindings like `item`.
            // Structural validation (no lambdas/arithmetic/conditionals), binding validation
            // (unknown root identifiers), and function call validation (unknown helpers)
            // are handled above.
            parts.Add(new CompiledMessagePart(expr, false, compilationResult.Compiled));

            idx = braceEnd + 1;
        }

        if (parts.Count == 0)
            return new FlowConsoleExpression(template, null, null);

        var compiled = new CompiledMessageTemplate(parts);
        return new FlowConsoleExpression(template, null, compiled);
    }

    private static List<Diagnostic> ValidateMessageTemplate(
        string template,
        IReadOnlySet<string> availableBindings,
        string path,
        string ruleId)
    {
        var diagnostics = new List<Diagnostic>();
        var idx = 0;

        while (idx < template.Length)
        {
            // Find ${
            var dollarIdx = template.IndexOf("${", idx, StringComparison.Ordinal);
            if (dollarIdx < 0) break;

            // Check for escape \${
            if (dollarIdx > 0 && template[dollarIdx - 1] == '\\')
            {
                idx = dollarIdx + 2;
                continue;
            }

            var braceStart = dollarIdx + 2;
            var braceEnd = FindClosingBrace(template, braceStart);
            if (braceEnd < 0) break;

            var expr = template[braceStart..braceEnd].Trim();

            // Extract root identifier
            var rootId = ExtractRootIdentifier(expr);
            if (rootId != null && !availableBindings.Contains(rootId))
            {
                // Check if it looks like a function call
                var afterRoot = expr.AsSpan(rootId.Length).TrimStart();
                if (afterRoot.Length == 0 || afterRoot[0] != '(')
                {
                    diagnostics.Add(new Diagnostic
                    {
                        Code = DiagnosticCodes.RF_EXPR_MESSAGE_UNKNOWN_BINDING,
                        Phase = DiagnosticPhase.Expression,
                        Level = DiagnosticLevel.Error,
                        Path = path,
                        Message = $"Unknown binding '{rootId}' in message template",
                        Hint = "Available bindings depend on the rule's kind, target, and mode",
                        RuleId = ruleId
                    });
                }
            }

            idx = braceEnd + 1;
        }

        return diagnostics;
    }

    // Lambda arrow in expression
    private static readonly Regex MessageLambdaPattern = new(
        @"\-\s*>",
        RegexOptions.Compiled);

    // Arithmetic/comparison operators
    private static readonly Regex MessageArithmeticPattern = new(
        @"(?<![=!<>])[+\-*/%]|[<>]=?|[!=]=|&&|\|\|",
        RegexOptions.Compiled);

    // Conditional ternary
    private static readonly Regex MessageConditionalPattern = new(
        @"\?",
        RegexOptions.Compiled);

    /// <summary>
    /// Replaces content inside double-quoted string literals with spaces
    /// so that regex checks don't match operators inside strings.
    /// Handles escaped quotes (\").
    /// </summary>
    private static string StripStringLiterals(string expr)
    {
        var sb = new System.Text.StringBuilder(expr.Length);
        var i = 0;
        while (i < expr.Length)
        {
            if (expr[i] == '"')
            {
                sb.Append('"');
                i++;
                // Skip content until closing quote, handling escaped quotes
                while (i < expr.Length)
                {
                    if (expr[i] == '\\' && i + 1 < expr.Length)
                    {
                        sb.Append(' ');
                        sb.Append(' ');
                        i += 2;
                    }
                    else if (expr[i] == '"')
                    {
                        sb.Append('"');
                        i++;
                        break;
                    }
                    else
                    {
                        sb.Append(' ');
                        i++;
                    }
                }
            }
            else
            {
                sb.Append(expr[i]);
                i++;
            }
        }
        return sb.ToString();
    }

    private static List<Diagnostic> ValidateMessageExpressionSubset(
        string expr, string path, string ruleId)
    {
        var diagnostics = new List<Diagnostic>();

        // Strip string literal content so regex patterns don't match
        // operators inside quoted strings (e.g. "pci-dss", "db-name")
        var stripped = StripStringLiterals(expr);

        if (MessageLambdaPattern.IsMatch(stripped))
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
        else if (MessageArithmeticPattern.IsMatch(stripped))
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_EXPR_UNSUPPORTED_CONSTRUCT,
                Phase = DiagnosticPhase.Expression,
                Level = DiagnosticLevel.Error,
                Path = path,
                Message = $"Arithmetic and comparison operators are not allowed in message templates: ${{{expr}}}",
                Hint = "Compute values in let-variables and reference them: ${myVar}",
                RuleId = ruleId
            });
        }
        else if (MessageConditionalPattern.IsMatch(stripped))
        {
            diagnostics.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_EXPR_UNSUPPORTED_CONSTRUCT,
                Phase = DiagnosticPhase.Expression,
                Level = DiagnosticLevel.Error,
                Path = path,
                Message = $"Conditional expressions are not allowed in message templates: ${{{expr}}}",
                Hint = "Compute values in let-variables and reference them: ${myVar}",
                RuleId = ruleId
            });
        }

        return diagnostics;
    }

    private List<Diagnostic> ValidateMessageFunctionCalls(
        string expr, string path, string ruleId)
    {
        var diagnostics = new List<Diagnostic>();

        var rootId = ExtractRootIdentifier(expr);
        if (rootId is null) return diagnostics;

        var afterRoot = expr.AsSpan(rootId.Length).TrimStart();
        if (afterRoot.Length > 0 && afterRoot[0] == '(')
        {
            // This is a function call — validate against the helper catalog
            if (!_helperCatalog.IsKnownHelper(rootId))
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_EXPR_COMPILE_ERROR,
                    Phase = DiagnosticPhase.Expression,
                    Level = DiagnosticLevel.Error,
                    Path = path,
                    Message = $"Unknown function '{rootId}' in message template",
                    Hint = "Only registered helper functions can be used in message templates",
                    RuleId = ruleId
                });
            }
        }

        return diagnostics;
    }

    private static string? ExtractRootIdentifier(string expr)
    {
        var trimmed = expr.Trim();
        var len = 0;
        foreach (var c in trimmed)
        {
            if (char.IsLetterOrDigit(c) || c == '_')
                len++;
            else
                break;
        }
        return len > 0 ? trimmed[..len] : null;
    }

    /// <summary>
    /// Finds the closing '}' that matches the interpolation opening, skipping over
    /// quoted strings so that '}' inside string literals is not treated as the end.
    /// Returns -1 if no matching brace is found.
    /// </summary>
    private static int FindClosingBrace(string template, int start)
    {
        var inString = false;
        for (var i = start; i < template.Length; i++)
        {
            var c = template[i];
            if (inString)
            {
                if (c == '\\' && i + 1 < template.Length)
                {
                    i++; // skip escaped char
                    continue;
                }
                if (c == '"')
                    inString = false;
                continue;
            }

            if (c == '"')
            {
                inString = true;
                continue;
            }

            if (c == '}')
                return i;
        }

        return -1;
    }

    private CompiledSelector? CompileSelector(
        Selector? selector,
        string path,
        IReadOnlyDictionary<string, Type> selectorWhereBindings,
        string ruleId,
        List<Diagnostic> diagnostics)
    {
        if (selector == null) return null;

        FlowConsoleExpression? where = null;
        if (selector.Where != null)
        {
            where = CompileExpression(selector.Where, selectorWhereBindings, $"{path}/where", ruleId, diagnostics);
        }

        // Validate regex patterns in selector
        ValidateSelectorRegex(selector, path, ruleId, diagnostics);

        return new CompiledSelector
        {
            Entity = selector.Entity,
            Kinds = selector.Kinds,
            TagsAny = selector.TagsAny,
            TagsAll = selector.TagsAll,
            Name = selector.Name,
            Technology = selector.Technology,
            SourceFamilies = selector.SourceFamilies,
            Properties = selector.Properties,
            Where = where
        };
    }

    private static void ValidateSelectorRegex(
        Selector selector, string path, string ruleId, List<Diagnostic> diagnostics)
    {
        if (selector.Name?.Matches != null)
        {
            var diag = RegexPatternValidator.Validate(selector.Name.Matches, $"{path}/name/matches", ruleId);
            if (diag != null) diagnostics.Add(diag);
        }

        if (selector.Technology?.Matches != null)
        {
            var diag = RegexPatternValidator.Validate(selector.Technology.Matches, $"{path}/technology/matches", ruleId);
            if (diag != null) diagnostics.Add(diag);
        }

        if (selector.Properties != null)
        {
            foreach (var (propName, matcher) in selector.Properties)
            {
                if (matcher.Matches != null)
                {
                    var diag = RegexPatternValidator.Validate(matcher.Matches, $"{path}/properties/{propName}/matches", ruleId);
                    if (diag != null) diagnostics.Add(diag);
                }
            }
        }
    }

    private static Dictionary<string, Type> ResolveRuleBindings(Rule rule)
    {
        var entity = rule.Subject?.Entity ?? EntityType.Elements;

        return rule.Kind switch
        {
            RuleKind.Element => ResolveElementBindings(rule.Target, entity, rule.Mode ?? ElementMode.PerItem),
            RuleKind.Flow => ResolveFlowBindings(rule.FlowMode ?? FlowMode.Aggregate),
            _ => new Dictionary<string, Type>()
        };
    }

    /// <summary>
    /// Resolves bindings available in rule.where.
    /// For element rules: where is a per-item filter applied before stats/items are
    /// computed, so only <c>item</c> is available.
    /// For flow rules: where is evaluated with the full flow bindings (aggregate or perPath).
    /// </summary>
    private static Dictionary<string, Type> ResolveWhereBindings(Rule rule)
    {
        // Flow rules evaluate where with the full flow bindings
        if (rule.Kind == RuleKind.Flow)
            return ResolveFlowBindings(rule.FlowMode ?? FlowMode.Aggregate);

        var entity = rule.Subject?.Entity ?? EntityType.Elements;

        var itemType = rule.Target == RuleTarget.Diff
            ? typeof(Bindings.DiffItem)
            : entity switch
            {
                EntityType.Elements => typeof(Bindings.ElementRef),
                EntityType.Relationships => typeof(Bindings.RelationshipRef),
                _ => typeof(Bindings.ElementRef)
            };

        return new Dictionary<string, Type>
        {
            ["item"] = itemType
        };
    }

    private static Dictionary<string, Type> ResolveElementBindings(
        RuleTarget target, EntityType entity, ElementMode mode)
    {
        if (target == RuleTarget.Diff)
        {
            return mode switch
            {
                ElementMode.PerItem => new Dictionary<string, Type>
                {
                    ["item"] = typeof(Bindings.DiffItem),
                    ["diff"] = typeof(Bindings.DriftDiff),
                    ["stats"] = typeof(Bindings.Stats),
                    ["rule"] = typeof(Bindings.RuleRef)
                },
                ElementMode.Aggregate => new Dictionary<string, Type>
                {
                    ["items"] = typeof(IReadOnlyList<Bindings.DiffItem>),
                    ["diff"] = typeof(Bindings.DriftDiff),
                    ["stats"] = typeof(Bindings.Stats),
                    ["rule"] = typeof(Bindings.RuleRef)
                },
                _ => new Dictionary<string, Type>()
            };
        }

        var itemType = entity switch
        {
            EntityType.Elements => typeof(Bindings.ElementRef),
            EntityType.Relationships => typeof(Bindings.RelationshipRef),
            _ => typeof(Bindings.ElementRef)
        };

        return mode switch
        {
            ElementMode.PerItem => new Dictionary<string, Type>
            {
                ["item"] = itemType,
                ["rule"] = typeof(Bindings.RuleRef)
            },
            ElementMode.Aggregate => new Dictionary<string, Type>
            {
                ["items"] = typeof(IReadOnlyList<object>),
                ["stats"] = typeof(Bindings.Stats),
                ["rule"] = typeof(Bindings.RuleRef)
            },
            _ => new Dictionary<string, Type>()
        };
    }

    private static Dictionary<string, Type> ResolveFlowBindings(FlowMode mode)
    {
        return mode switch
        {
            FlowMode.PerPath => new Dictionary<string, Type>
            {
                ["path"] = typeof(Bindings.PathRef),
                ["paths"] = typeof(IReadOnlyList<Bindings.PathRef>),
                ["from"] = typeof(Bindings.ElementRef),
                ["to"] = typeof(Bindings.ElementRef),
                ["stats"] = typeof(Bindings.Stats),
                ["rule"] = typeof(Bindings.RuleRef)
            },
            FlowMode.Aggregate => new Dictionary<string, Type>
            {
                ["paths"] = typeof(IReadOnlyList<Bindings.PathRef>),
                ["from"] = typeof(Bindings.ElementRef),
                ["to"] = typeof(Bindings.ElementRef),
                ["stats"] = typeof(Bindings.Stats),
                ["rule"] = typeof(Bindings.RuleRef)
            },
            _ => new Dictionary<string, Type>()
        };
    }

    private static Dictionary<string, Type> ResolveSelectorWhereBindings(Rule rule)
    {
        var entity = rule.Subject?.Entity ?? EntityType.Elements;
        var itemType = entity switch
        {
            EntityType.Elements => typeof(Bindings.ElementRef),
            EntityType.Relationships => typeof(Bindings.RelationshipRef),
            EntityType.DiffItems => typeof(Bindings.DiffItem),
            _ => typeof(object)
        };

        return new Dictionary<string, Type>
        {
            ["item"] = itemType
        };
    }

    private void CheckLetReservedNames(
        IReadOnlyDictionary<string, string> letVars, string path, string ruleId, List<Diagnostic> diagnostics)
    {
        var reserved = _helperCatalog.GetReservedNames();
        foreach (var varName in letVars.Keys)
        {
            if (reserved.Contains(varName))
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_EXPR_RESERVED_NAME,
                    Phase = DiagnosticPhase.Expression,
                    Level = DiagnosticLevel.Error,
                    Path = $"{path}/let/{varName}",
                    Message = $"Let variable '{varName}' uses a reserved name.",
                    RuleId = ruleId
                });
            }
        }
    }

    private static void CheckLetDependencyCycles(
        IReadOnlyDictionary<string, string> letVars, string path, string ruleId, List<Diagnostic> diagnostics)
    {
        // Build a dependency graph between let variables
        var varNames = new HashSet<string>(letVars.Keys);
        var dependencies = new Dictionary<string, HashSet<string>>();

        foreach (var (varName, expression) in letVars)
        {
            var deps = new HashSet<string>();
            foreach (var other in varNames)
            {
                if (other != varName && ContainsIdentifier(expression, other))
                    deps.Add(other);
            }
            dependencies[varName] = deps;
        }

        // Topological sort to detect cycles
        var visited = new HashSet<string>();
        var inStack = new HashSet<string>();

        foreach (var varName in varNames)
        {
            if (HasCycle(varName, dependencies, visited, inStack))
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_EXPR_LET_DEPENDENCY_CYCLE,
                    Phase = DiagnosticPhase.Expression,
                    Level = DiagnosticLevel.Error,
                    Path = $"{path}/let/{varName}",
                    Message = $"Let variable '{varName}' is part of a dependency cycle.",
                    RuleId = ruleId
                });
            }
        }
    }

    private static bool HasCycle(
        string node,
        Dictionary<string, HashSet<string>> deps,
        HashSet<string> visited,
        HashSet<string> inStack)
    {
        if (inStack.Contains(node)) return true;
        if (visited.Contains(node)) return false;

        visited.Add(node);
        inStack.Add(node);

        if (deps.TryGetValue(node, out var neighbors))
        {
            foreach (var neighbor in neighbors)
            {
                if (HasCycle(neighbor, deps, visited, inStack))
                    return true;
            }
        }

        inStack.Remove(node);
        return false;
    }

    private static bool ContainsIdentifier(string expression, string identifier)
    {
        int startIndex = 0;
        while (true)
        {
            int pos = expression.IndexOf(identifier, startIndex, StringComparison.Ordinal);
            if (pos < 0) return false;

            bool leftBoundary = pos == 0 || !IsIdentifierChar(expression[pos - 1]);
            int afterEnd = pos + identifier.Length;
            bool rightBoundary = afterEnd >= expression.Length || !IsIdentifierChar(expression[afterEnd]);

            if (leftBoundary && rightBoundary)
                return true;

            startIndex = pos + 1;
        }
    }

    private static bool IsIdentifierChar(char c) => char.IsLetterOrDigit(c) || c == '_';
}

/// <summary>
/// Intermediate compiled rule before normalization.
/// </summary>
internal sealed record CompiledRuleIntermediate
{
    public required Rule Rule { get; init; }
    public required FlowConsoleExpression Assert { get; init; }
    public required FlowConsoleExpression Message { get; init; }
    public FlowConsoleExpression? Where { get; init; }
    public IReadOnlyDictionary<string, FlowConsoleExpression>? Let { get; init; }
    public CompiledSelector? Subject { get; init; }
    public CompiledSelector? From { get; init; }
    public CompiledSelector? To { get; init; }
    public CompiledSelector? Via { get; init; }
}

internal sealed record ExpressionPhaseResult(
    IReadOnlyList<CompiledRuleIntermediate> CompiledRules,
    IReadOnlyList<Diagnostic> Diagnostics)
{
    public bool HasErrors => Diagnostics.Any(d => d.Level == DiagnosticLevel.Error);
}

/// <summary>
/// Minimal RE2 regex pattern validator used in ExpressionPhase.
/// Rejects backreferences, lookaround, possessive quantifiers, and atomic groups.
/// </summary>
internal static class RegexPatternValidator
{
    public static Diagnostic? Validate(string pattern, string path, string? ruleId = null)
    {
        string? reason = null;

        if (System.Text.RegularExpressions.Regex.IsMatch(pattern, @"\\[1-9]"))
            reason = "Backreferences (\\1, \\2, etc.) are not supported in RE2";
        else if (System.Text.RegularExpressions.Regex.IsMatch(pattern, @"\(\?[=!]|\(\?<[=!]"))
            reason = "Lookahead/lookbehind assertions are not supported in RE2";
        else if (System.Text.RegularExpressions.Regex.IsMatch(pattern, @"[*+?]\+|\}[+]"))
            reason = "Possessive quantifiers (*+, ++, ?+) are not supported in RE2";
        else if (System.Text.RegularExpressions.Regex.IsMatch(pattern, @"\(\?>"))
            reason = "Atomic groups (?>...) are not supported in RE2";

        if (reason == null)
        {
            try
            {
                _ = new System.Text.RegularExpressions.Regex(pattern, System.Text.RegularExpressions.RegexOptions.None, TimeSpan.FromMilliseconds(100));
            }
            catch (ArgumentException ex)
            {
                reason = $"Invalid regular expression: {ex.Message}";
            }
        }

        if (reason == null) return null;

        return new Diagnostic
        {
            Code = DiagnosticCodes.RF_EXPR_REGEX_UNSUPPORTED_FEATURE,
            Phase = DiagnosticPhase.Expression,
            Level = DiagnosticLevel.Error,
            Path = path,
            Message = reason,
            Hint = "Use only RE2-compatible regex syntax",
            RuleId = ruleId
        };
    }
}
