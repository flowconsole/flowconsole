using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Core.Ingest;

/// <summary>
/// Phase 3: Semantic validation of cross-field constraints.
/// Runs after schema validation — all fields are guaranteed to be well-typed.
/// Collects all errors (does not short-circuit on the first one).
/// </summary>
internal sealed class SemanticValidator
{
    public SemanticValidationResult Validate(RuleFile ruleFile)
    {
        var diags = new List<Diagnostic>();

        CheckDuplicateRuleIds(ruleFile.Rules, diags);

        for (int i = 0; i < ruleFile.Rules.Count; i++)
        {
            var rule = ruleFile.Rules[i];
            var path = $"/rules/{i}";

            CheckDiffItemsOnNonDiff(rule, path, diags);
            CheckChangeKindsOnNonDiff(rule, path, diags);
            CheckSourceFamilyOnModel(rule, path, diags);
            CheckFlowEndpointEntity(rule, path, diags);
            CheckFlowOnDiff(rule, path, diags);
            CheckSelectorShapeIncompatible(rule, path, diags);
            CheckLetSelfReference(rule, path, diags);
        }

        return new SemanticValidationResult(diags);
    }

    private static void CheckDuplicateRuleIds(IReadOnlyList<Rule> rules, List<Diagnostic> diags)
    {
        var seen = new HashSet<string>();
        for (int i = 0; i < rules.Count; i++)
        {
            if (!seen.Add(rules[i].Id))
            {
                diags.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_SEM_DUPLICATE_RULE_ID,
                    Phase = DiagnosticPhase.Semantic,
                    Level = DiagnosticLevel.Error,
                    Path = $"/rules/{i}/id",
                    Message = $"Duplicate rule id '{rules[i].Id}'.",
                    RuleId = rules[i].Id
                });
            }
        }
    }

    private static void CheckDiffItemsOnNonDiff(Rule rule, string path, List<Diagnostic> diags)
    {
        if (rule.Target == RuleTarget.Diff) return;

        // Check subject
        if (rule.Subject?.Entity == EntityType.DiffItems)
        {
            diags.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_SEM_DIFFITEMS_ON_NON_DIFF_TARGET,
                Phase = DiagnosticPhase.Semantic,
                Level = DiagnosticLevel.Error,
                Path = $"{path}/subject/entity",
                Message = $"entity 'diffItems' is only valid when target is 'diff', but target is '{rule.Target.ToString().ToLowerInvariant()}'.",
                RuleId = rule.Id
            });
        }
    }

    private static void CheckChangeKindsOnNonDiff(Rule rule, string path, List<Diagnostic> diags)
    {
        if (rule.Target == RuleTarget.Diff) return;

        if (rule.ChangeKinds is { Count: > 0 })
        {
            diags.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_SEM_CHANGEKINDS_ON_NON_DIFF_TARGET,
                Phase = DiagnosticPhase.Semantic,
                Level = DiagnosticLevel.Error,
                Path = $"{path}/changeKinds",
                Message = $"'changeKinds' is only valid when target is 'diff', but target is '{rule.Target.ToString().ToLowerInvariant()}'.",
                RuleId = rule.Id
            });
        }
    }

    private static void CheckSourceFamilyOnModel(Rule rule, string path, List<Diagnostic> diags)
    {
        if (rule.Target != RuleTarget.Model) return;

        // Rule-level sourceFamilies
        if (rule.SourceFamilies is { Count: > 0 })
        {
            diags.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_SEM_SOURCE_FAMILY_ON_MODEL_TARGET,
                Phase = DiagnosticPhase.Semantic,
                Level = DiagnosticLevel.Error,
                Path = $"{path}/sourceFamilies",
                Message = "'sourceFamilies' is not valid when target is 'model'. Model projection uses only git source.",
                RuleId = rule.Id
            });
        }

        // Selector-level sourceFamilies
        CheckSelectorSourceFamilyOnModel(rule.Subject, $"{path}/subject", rule.Id, diags);
        CheckSelectorSourceFamilyOnModel(rule.From, $"{path}/from", rule.Id, diags);
        CheckSelectorSourceFamilyOnModel(rule.To, $"{path}/to", rule.Id, diags);
        CheckSelectorSourceFamilyOnModel(rule.Via, $"{path}/via", rule.Id, diags);
    }

    private static void CheckSelectorSourceFamilyOnModel(
        Selector? selector, string path, string ruleId, List<Diagnostic> diags)
    {
        if (selector?.SourceFamilies is { Count: > 0 })
        {
            diags.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_SEM_SOURCE_FAMILY_ON_MODEL_TARGET,
                Phase = DiagnosticPhase.Semantic,
                Level = DiagnosticLevel.Error,
                Path = $"{path}/sourceFamilies",
                Message = "'sourceFamilies' is not valid when target is 'model'. Model projection uses only git source.",
                RuleId = ruleId
            });
        }
    }

    private static void CheckFlowEndpointEntity(Rule rule, string path, List<Diagnostic> diags)
    {
        if (rule.Kind != RuleKind.Flow) return;

        if (rule.From?.Entity is EntityType.Relationships or EntityType.DiffItems)
        {
            diags.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_SEM_FLOW_ENDPOINT_INVALID_ENTITY,
                Phase = DiagnosticPhase.Semantic,
                Level = DiagnosticLevel.Error,
                Path = $"{path}/from/entity",
                Message = $"Flow endpoint 'from' must use entity 'elements', got '{EntityToString(rule.From.Entity)}'.",
                RuleId = rule.Id
            });
        }

        if (rule.To?.Entity is EntityType.Relationships or EntityType.DiffItems)
        {
            diags.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_SEM_FLOW_ENDPOINT_INVALID_ENTITY,
                Phase = DiagnosticPhase.Semantic,
                Level = DiagnosticLevel.Error,
                Path = $"{path}/to/entity",
                Message = $"Flow endpoint 'to' must use entity 'elements', got '{EntityToString(rule.To.Entity)}'.",
                RuleId = rule.Id
            });
        }
    }

    private static void CheckFlowOnDiff(Rule rule, string path, List<Diagnostic> diags)
    {
        if (rule.Kind != RuleKind.Flow) return;
        if (rule.Target != RuleTarget.Diff) return;

        diags.Add(new Diagnostic
        {
            Code = DiagnosticCodes.RF_SEM_FLOW_ON_DIFF_TARGET,
            Phase = DiagnosticPhase.Semantic,
            Level = DiagnosticLevel.Error,
            Path = $"{path}/target",
            Message = "Flow rules do not support target 'diff'. Use 'model' or 'actual'.",
            RuleId = rule.Id
        });
    }

    private static void CheckSelectorShapeIncompatible(Rule rule, string path, List<Diagnostic> diags)
    {
        // element + target=diff requires entity=diffItems in subject
        if (rule.Kind == RuleKind.Element && rule.Target == RuleTarget.Diff)
        {
            if (rule.Subject != null && rule.Subject.Entity != EntityType.DiffItems)
            {
                diags.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_SEM_SELECTOR_SHAPE_INCOMPATIBLE,
                    Phase = DiagnosticPhase.Semantic,
                    Level = DiagnosticLevel.Error,
                    Path = $"{path}/subject/entity",
                    Message = $"Element rules with target 'diff' require subject entity 'diffItems', got '{EntityToString(rule.Subject.Entity)}'.",
                    RuleId = rule.Id
                });
            }
        }
    }

    private static void CheckLetSelfReference(Rule rule, string path, List<Diagnostic> diags)
    {
        if (rule.Let == null) return;

        foreach (var (varName, expression) in rule.Let)
        {
            if (ContainsIdentifier(expression, varName))
            {
                diags.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_SEM_LET_SELF_REFERENCE,
                    Phase = DiagnosticPhase.Semantic,
                    Level = DiagnosticLevel.Error,
                    Path = $"{path}/let/{varName}",
                    Message = $"Let variable '{varName}' references itself.",
                    RuleId = rule.Id
                });
            }
        }
    }

    /// <summary>
    /// Checks if an expression contains a reference to the given identifier.
    /// Uses word-boundary detection to avoid false positives (e.g. "maxCount" matching "x").
    /// </summary>
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

    private static bool IsIdentifierChar(char c) =>
        char.IsLetterOrDigit(c) || c == '_';

    private static string EntityToString(EntityType entity) => entity switch
    {
        EntityType.Elements => "elements",
        EntityType.Relationships => "relationships",
        EntityType.DiffItems => "diffItems",
        _ => entity.ToString()
    };
}

internal sealed record SemanticValidationResult(IReadOnlyList<Diagnostic> Diagnostics)
{
    public bool HasErrors => Diagnostics.Any(d => d.Level == DiagnosticLevel.Error);
}
