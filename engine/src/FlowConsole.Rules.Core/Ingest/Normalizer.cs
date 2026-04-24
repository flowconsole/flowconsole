using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Core.Ingest;

/// <summary>
/// Phase 5: Normalization. Fills defaults, generates canonical keys,
/// and assembles the final FlowConsoleRule compiled model.
/// </summary>
internal sealed class Normalizer
{
    public NormalizerResult Normalize(
        IReadOnlyList<CompiledRuleIntermediate> compiledRules,
        string filePath)
    {
        var diagnostics = new List<Diagnostic>();
        var rules = new List<FlowConsoleRule>();
        var canonicalKeys = new HashSet<string>();

        foreach (var compiled in compiledRules)
        {
            var rule = compiled.Rule;
            var canonicalKey = $"{filePath}#{rule.Id}";

            if (!canonicalKeys.Add(canonicalKey))
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_NORM_CANONICAL_KEY_CONFLICT,
                    Phase = DiagnosticPhase.Normalize,
                    Level = DiagnosticLevel.Error,
                    Path = $"/rules/{rules.Count}",
                    Message = $"Canonical key conflict: '{canonicalKey}' already exists.",
                    RuleId = rule.Id
                });
                continue;
            }

            try
            {
                var flowConsoleRule = AssembleRule(compiled, canonicalKey);
                rules.Add(flowConsoleRule);
            }
            catch (Exception ex)
            {
                diagnostics.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_NORM_ASSEMBLY_FAILED,
                    Phase = DiagnosticPhase.Normalize,
                    Level = DiagnosticLevel.Error,
                    Path = $"/rules/{rules.Count}",
                    Message = $"Failed to assemble compiled rule: {ex.Message}",
                    RuleId = rule.Id
                });
            }
        }

        return new NormalizerResult(rules, diagnostics);
    }

    private static FlowConsoleRule AssembleRule(CompiledRuleIntermediate compiled, string canonicalKey)
    {
        var rule = compiled.Rule;

        // Fill defaults per plan:
        // enabled=true, mode: perItem for element / aggregate for flow
        // maxDepth=8, allowCycles=false, viaMode=include
        var enabled = rule.Enabled ?? true;

        ElementMode? mode = null;
        FlowMode? flowMode = null;

        if (rule.Kind == RuleKind.Element)
        {
            mode = rule.Mode ?? ElementMode.PerItem;
        }
        else if (rule.Kind == RuleKind.Flow)
        {
            flowMode = rule.FlowMode ?? FlowMode.Aggregate;
        }

        var viaMode = rule.Kind == RuleKind.Flow
            ? (rule.ViaMode ?? ViaMode.Include)
            : rule.ViaMode;

        var maxDepth = rule.Kind == RuleKind.Flow
            ? (rule.MaxDepth ?? 8)
            : rule.MaxDepth;

        var allowCycles = rule.Kind == RuleKind.Flow
            ? (rule.AllowCycles ?? false)
            : rule.AllowCycles;

        return new FlowConsoleRule
        {
            CanonicalKey = canonicalKey,
            Id = rule.Id,
            Name = rule.Name,
            Kind = rule.Kind,
            Target = rule.Target,
            Severity = rule.Severity,
            Blocking = rule.Blocking,
            Enabled = enabled,
            Description = rule.Description,
            Tags = rule.Tags,
            SourceFamilies = rule.SourceFamilies,
            Assert = compiled.Assert,
            Message = compiled.Message,
            Where = compiled.Where,
            Let = compiled.Let,
            Subject = compiled.Subject,
            Mode = mode,
            ChangeKinds = rule.ChangeKinds,
            From = compiled.From,
            To = compiled.To,
            Via = compiled.Via,
            ViaMode = viaMode,
            FlowMode = flowMode,
            MaxDepth = maxDepth,
            AllowCycles = allowCycles
        };
    }
}

internal sealed record NormalizerResult(
    IReadOnlyList<FlowConsoleRule> Rules,
    IReadOnlyList<Diagnostic> Diagnostics)
{
    public bool HasErrors => Diagnostics.Any(d => d.Level == DiagnosticLevel.Error);
}
