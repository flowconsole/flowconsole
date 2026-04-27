using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Core.Bindings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Execution;
using FlowConsole.Rules.Core.Model;

namespace FlowConsole.Rules.Engine.Default;

/// <summary>
/// Executes compiled rule files against model data.
/// An error in one rule does not prevent other rules from executing.
/// </summary>
public sealed class DefaultRuleExecutor : IRuleExecutor
{
    private readonly ISubjectResolver _subjectResolver;
    private readonly IPathFinder _pathFinder;
    private readonly IExpressionEvaluator _evaluator;
    private readonly IBindingContextBuilder _bindingContextBuilder;
    private readonly MessageInterpolator _messageInterpolator;

    public DefaultRuleExecutor(
        ISubjectResolver subjectResolver,
        IPathFinder pathFinder,
        IExpressionEvaluator evaluator,
        IBindingContextBuilder? bindingContextBuilder = null)
    {
        _subjectResolver = subjectResolver;
        _pathFinder = pathFinder;
        _evaluator = evaluator;
        _bindingContextBuilder = bindingContextBuilder ?? new BindingContextBuilder();
        _messageInterpolator = new MessageInterpolator(evaluator);
    }

    public RuleExecutionResult Execute(FlowConsoleRuleFile ruleFile)
    {
        var findings = new List<Finding>();
        var errors = new List<RuleExecutionError>();
        var passedCount = 0;
        var failedCount = 0;

        foreach (var rule in ruleFile.Rules)
        {
            if (!rule.Enabled)
                continue;

            try
            {
                var ruleFindings = ExecuteRule(rule, out var ruleErrors);
                findings.AddRange(ruleFindings);
                errors.AddRange(ruleErrors);

                if (ruleErrors.Count > 0)
                {
                    // Rule had errors — don't count as passed or failed
                }
                else if (ruleFindings.Count > 0)
                {
                    failedCount++;
                }
                else
                {
                    passedCount++;
                }
            }
            catch (Exception ex)
            {
                errors.Add(new RuleExecutionError(
                    rule.Id,
                    DiagnosticCodes.RE_EXPRESSION_RUNTIME_ERROR,
                    $"Unexpected error executing rule '{rule.Id}': {ex.Message}"));
            }
        }

        return new RuleExecutionResult
        {
            Findings = findings,
            Errors = errors,
            ExecutedAt = DateTimeOffset.UtcNow,
            RuleCount = ruleFile.Rules.Count(r => r.Enabled),
            PassedCount = passedCount,
            FailedCount = failedCount
        };
    }

    private List<Finding> ExecuteRule(FlowConsoleRule rule, out List<RuleExecutionError> errors)
    {
        errors = [];

        return rule.Kind switch
        {
            RuleKind.Element => ExecuteElementRule(rule, errors),
            RuleKind.Flow => ExecuteFlowRule(rule, errors),
            _ => []
        };
    }

    private List<Finding> ExecuteElementRule(FlowConsoleRule rule, List<RuleExecutionError> errors)
    {
        if (rule.Subject is null)
        {
            errors.Add(new RuleExecutionError(rule.Id, DiagnosticCodes.RF_EXPR_COMPILE_ERROR,
                "Element rule missing subject selector"));
            return [];
        }

        // Resolve subject
        var resolution = _subjectResolver.Resolve(
            rule.Subject, rule.Target, rule.SourceFamilies, rule.ChangeKinds);

        if (!resolution.IsSuccess)
        {
            errors.Add(resolution.Error! with { RuleId = rule.Id });
            return [];
        }

        var ruleRef = BuildRuleRef(rule);

        // Choose execution path based on target and mode
        if (rule.Target == RuleTarget.Diff)
        {
            return ExecuteElementDiffRule(rule, resolution, ruleRef, errors);
        }

        return rule.Subject.Entity switch
        {
            EntityType.Elements => ExecuteElementsRule(rule, resolution.Elements, ruleRef, errors),
            EntityType.Relationships => ExecuteRelationshipsRule(rule, resolution.Relationships, ruleRef, errors),
            _ => []
        };
    }

    private List<Finding> ExecuteElementsRule(
        FlowConsoleRule rule,
        IReadOnlyList<ElementRef> elements,
        RuleRef ruleRef,
        List<RuleExecutionError> errors)
    {
        // Apply rule.where as post-filter
        var filtered = ApplyRuleWhere(rule, elements.Cast<object>().ToList(), errors);
        if (filtered is null) return [];

        var stats = StatsBuilder.FromElements(filtered.Cast<ElementRef>().ToList());

        if (rule.Mode == ElementMode.Aggregate)
        {
            return ExecuteAggregate(rule, filtered, stats, ruleRef, null, errors);
        }

        // PerItem
        var findings = new List<Finding>();
        foreach (var item in filtered)
        {
            var ctx = _bindingContextBuilder.BuildElementPerItem(item, ruleRef);
            var finding = EvaluateAssert(rule, ctx, [(item as ElementRef)?.Id ?? ""], errors);
            if (finding is not null)
                findings.Add(finding);
        }
        return findings;
    }

    private List<Finding> ExecuteRelationshipsRule(
        FlowConsoleRule rule,
        IReadOnlyList<RelationshipRef> relationships,
        RuleRef ruleRef,
        List<RuleExecutionError> errors)
    {
        var filtered = ApplyRuleWhere(rule, relationships.Cast<object>().ToList(), errors);
        if (filtered is null) return [];

        var stats = StatsBuilder.FromRelationships(filtered.Cast<RelationshipRef>().ToList());

        if (rule.Mode == ElementMode.Aggregate)
        {
            return ExecuteAggregate(rule, filtered, stats, ruleRef, null, errors);
        }

        var findings = new List<Finding>();
        foreach (var item in filtered)
        {
            var ctx = _bindingContextBuilder.BuildElementPerItem(item, ruleRef);
            var rel = item as RelationshipRef;
            var elementIds = new List<string>();
            if (rel is not null)
            {
                elementIds.Add(rel.SourceId);
                elementIds.Add(rel.TargetId);
            }
            var finding = EvaluateAssert(rule, ctx, elementIds, errors);
            if (finding is not null)
                findings.Add(finding);
        }
        return findings;
    }

    private List<Finding> ExecuteElementDiffRule(
        FlowConsoleRule rule,
        SubjectResolutionResult resolution,
        RuleRef ruleRef,
        List<RuleExecutionError> errors)
    {
        var diffItems = resolution.DiffItems;
        var driftDiff = resolution.DriftDiff;

        var filtered = ApplyRuleWhere(rule, diffItems.Cast<object>().ToList(), errors);
        if (filtered is null) return [];

        var typedItems = filtered.Cast<DiffItem>().ToList();
        var stats = StatsBuilder.FromDiffItems(typedItems);

        if (rule.Mode == ElementMode.Aggregate)
        {
            return ExecuteAggregate(rule, filtered, stats, ruleRef, driftDiff, errors);
        }

        // PerItem for diff
        var findings = new List<Finding>();
        foreach (var item in filtered)
        {
            var diffItem = (DiffItem)item;
            var ctx = _bindingContextBuilder.BuildElementPerItem(item, ruleRef, driftDiff, stats);
            var elementIds = new List<string>();
            var observed = diffItem.Actual ?? diffItem.Model;
            if (observed is not null)
                elementIds.Add(observed.Id);

            var finding = EvaluateAssert(rule, ctx, elementIds, errors);
            if (finding is not null)
                findings.Add(finding);
        }
        return findings;
    }

    private List<Finding> ExecuteAggregate(
        FlowConsoleRule rule,
        List<object> items,
        Stats stats,
        RuleRef ruleRef,
        DriftDiff? driftDiff,
        List<RuleExecutionError> errors)
    {
        var ctx = _bindingContextBuilder.BuildElementAggregate(items, stats, ruleRef, driftDiff);

        // Collect element IDs from all items
        var elementIds = CollectElementIds(items);

        var finding = EvaluateAssert(rule, ctx, elementIds, errors);
        return finding is not null ? [finding] : [];
    }

    private List<Finding> ExecuteFlowRule(FlowConsoleRule rule, List<RuleExecutionError> errors)
    {
        if (rule.From is null || rule.To is null)
        {
            errors.Add(new RuleExecutionError(rule.Id, DiagnosticCodes.RF_EXPR_COMPILE_ERROR,
                "Flow rule missing from/to selectors"));
            return [];
        }

        var pathResult = _pathFinder.FindPaths(
            rule.From,
            rule.To,
            rule.Via,
            rule.ViaMode ?? ViaMode.Include,
            rule.MaxDepth ?? 8,
            rule.AllowCycles ?? false,
            rule.SourceFamilies);

        if (!pathResult.IsSuccess)
        {
            errors.Add(pathResult.Error! with { RuleId = rule.Id });
            return [];
        }

        var paths = pathResult.Paths;
        var ruleRef = BuildRuleRef(rule);

        // Apply where filter to paths if present
        if (rule.Where?.Compiled is not null)
        {
            if (rule.FlowMode == FlowMode.Aggregate)
            {
                // Aggregate where: evaluate once as a guard condition with full aggregate bindings.
                // Evaluate even when paths is empty — this allows guards like
                // where: count(paths) > 0 to silently skip the rule.
                var fromEl = paths.Count > 0 ? paths[0].From : ElementRef.Empty;
                var toEl = paths.Count > 0 ? paths[0].To : ElementRef.Empty;
                var preFilterStats = StatsBuilder.FromPaths(paths);
                var ctx = _bindingContextBuilder.BuildFlowAggregate(paths, fromEl, toEl, preFilterStats, ruleRef);
                var result = _evaluator.Evaluate(rule.Where.Compiled, ctx);
                if (!result.IsSuccess)
                {
                    errors.Add(result.Error! with { RuleId = rule.Id });
                    return [];
                }
                if (result.Value is not true)
                    return []; // guard failed, skip rule
            }
            else if (paths.Count > 0)
            {
                // PerPath where: filter individual paths with full per-path bindings.
                // When paths is empty there's nothing to filter, so skip.
                var preFilterStats = StatsBuilder.FromPaths(paths);
                var filteredPaths = new List<PathRef>();
                foreach (var path in paths)
                {
                    var ctx = _bindingContextBuilder.BuildFlowPerPath(path, paths, path.From, path.To, preFilterStats, ruleRef);
                    var result = _evaluator.Evaluate(rule.Where.Compiled, ctx);
                    if (!result.IsSuccess)
                    {
                        errors.Add(result.Error! with { RuleId = rule.Id });
                        return [];
                    }
                    if (result.Value is true)
                        filteredPaths.Add(path);
                }
                paths = filteredPaths;
            }
        }

        var stats = StatsBuilder.FromPaths(paths);

        if (rule.FlowMode == FlowMode.Aggregate)
        {
            // For aggregate mode, always evaluate — even with empty paths.
            // This allows assertions like count(paths) > 0 to detect missing paths.
            // Use ElementRef.Empty sentinel when no paths exist so from/to are never null.
            var fromEl = paths.Count > 0 ? paths[0].From : ElementRef.Empty;
            var toEl = paths.Count > 0 ? paths[0].To : ElementRef.Empty;
            return ExecuteFlowAggregate(rule, paths, fromEl, toEl, stats, ruleRef, errors);
        }

        // PerPath: empty paths = no iterations = natural pass
        if (paths.Count == 0)
            return [];

        var findings = new List<Finding>();
        foreach (var path in paths)
        {
            var ctx = _bindingContextBuilder.BuildFlowPerPath(path, paths, path.From, path.To, stats, ruleRef);
            ApplyLetVariables(rule, ctx, errors);

            var assertResult = _evaluator.Evaluate(rule.Assert.Compiled!, ctx);
            if (!assertResult.IsSuccess)
            {
                errors.Add(assertResult.Error! with { RuleId = rule.Id });
                continue;
            }

            if (assertResult.Value is false)
            {
                var elementIds = path.Nodes.Select(n => n.Id).ToList();
                var message = InterpolateMessage(rule, ctx);
                findings.Add(EmitFinding(rule, message, elementIds));
            }
        }
        return findings;
    }

    private List<Finding> ExecuteFlowAggregate(
        FlowConsoleRule rule,
        IReadOnlyList<PathRef> paths,
        ElementRef? fromEl,
        ElementRef? toEl,
        Stats stats,
        RuleRef ruleRef,
        List<RuleExecutionError> errors)
    {
        var ctx = _bindingContextBuilder.BuildFlowAggregate(paths, fromEl!, toEl!, stats, ruleRef);
        ApplyLetVariables(rule, ctx, errors);

        var assertResult = _evaluator.Evaluate(rule.Assert.Compiled!, ctx);
        if (!assertResult.IsSuccess)
        {
            errors.Add(assertResult.Error! with { RuleId = rule.Id });
            return [];
        }

        if (assertResult.Value is false)
        {
            var elementIds = paths.SelectMany(p => p.Nodes.Select(n => n.Id)).Distinct().ToList();
            var message = InterpolateMessage(rule, ctx);
            return [EmitFinding(rule, message, elementIds)];
        }

        return [];
    }

    private List<object>? ApplyRuleWhere(
        FlowConsoleRule rule,
        List<object> items,
        List<RuleExecutionError> errors)
    {
        if (rule.Where?.Compiled is null)
            return items;

        var filtered = new List<object>();
        foreach (var item in items)
        {
            var ctx = new Dictionary<string, object?> { ["item"] = item };
            var result = _evaluator.Evaluate(rule.Where.Compiled, ctx);
            if (!result.IsSuccess)
            {
                errors.Add(result.Error! with { RuleId = rule.Id });
                return null;
            }
            if (result.Value is true)
                filtered.Add(item);
        }
        return filtered;
    }

    private Finding? EvaluateAssert(
        FlowConsoleRule rule,
        Dictionary<string, object?> ctx,
        List<string> elementIds,
        List<RuleExecutionError> errors)
    {
        ApplyLetVariables(rule, ctx, errors);

        if (rule.Assert.Compiled is null)
        {
            errors.Add(new RuleExecutionError(rule.Id, DiagnosticCodes.RF_EXPR_COMPILE_ERROR,
                "Rule has no compiled assert expression"));
            return null;
        }

        var result = _evaluator.Evaluate(rule.Assert.Compiled, ctx);
        if (!result.IsSuccess)
        {
            errors.Add(result.Error! with { RuleId = rule.Id });
            return null;
        }

        if (result.Value is false)
        {
            var message = InterpolateMessage(rule, ctx);
            return EmitFinding(rule, message, elementIds);
        }

        return null;
    }

    private void ApplyLetVariables(
        FlowConsoleRule rule,
        Dictionary<string, object?> ctx,
        List<RuleExecutionError> errors)
    {
        if (rule.Let is null)
            return;

        foreach (var (name, expr) in rule.Let)
        {
            if (expr.Compiled is null)
                continue;

            var result = _evaluator.Evaluate(expr.Compiled, ctx);
            if (result.IsSuccess)
            {
                ctx[name] = result.Value;
            }
            else
            {
                errors.Add(result.Error! with { RuleId = rule.Id });
                ctx[name] = null;
            }
        }
    }

    private string InterpolateMessage(FlowConsoleRule rule, Dictionary<string, object?> ctx)
    {
        if (rule.Message.Compiled is CompiledMessageTemplate)
        {
            var result = _messageInterpolator.Interpolate(rule.Message.Source, rule.Message.Compiled, ctx);
            return result.Message;
        }

        // Fallback: try simple interpolation on the source
        return SimpleInterpolate(rule.Message.Source, ctx);
    }

    private static readonly System.Text.RegularExpressions.Regex SimpleInterpolatePattern =
        new(@"(?<!\\)\$\{([^}]+)\}", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static string SimpleInterpolate(string template, IReadOnlyDictionary<string, object?> bindings)
    {
        return SimpleInterpolatePattern.Replace(
            template,
            match =>
            {
                var expr = match.Groups[1].Value.Trim();
                if (bindings.TryGetValue(expr, out var value))
                    return value?.ToString() ?? "null";

                // Resolve dotted property access: e.g. "item.Name" → bindings["item"].Name
                var dotIdx = expr.IndexOf('.');
                if (dotIdx > 0)
                {
                    var root = expr[..dotIdx];
                    var prop = expr[(dotIdx + 1)..];
                    if (bindings.TryGetValue(root, out var obj) && obj is not null)
                    {
                        var propInfo = obj.GetType().GetProperty(prop,
                            System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.IgnoreCase);
                        if (propInfo is not null)
                            return propInfo.GetValue(obj)?.ToString() ?? "null";
                    }
                }

                return match.Value;
            });
    }

    private static Finding EmitFinding(FlowConsoleRule rule, string message, List<string> elementIds)
    {
        return new Finding
        {
            RuleId = rule.Id,
            RuleName = rule.Name,
            Severity = rule.Severity.ToString().ToLowerInvariant(),
            Blocking = rule.Blocking,
            Message = message,
            ElementIds = elementIds
        };
    }

    private static RuleRef BuildRuleRef(FlowConsoleRule rule)
    {
        return new RuleRef
        {
            Id = rule.Id,
            Name = rule.Name,
            Severity = rule.Severity.ToString().ToLowerInvariant(),
            Kind = rule.Kind.ToString().ToLowerInvariant(),
            Target = rule.Target.ToString().ToLowerInvariant()
        };
    }

    private static List<string> CollectElementIds(List<object> items)
    {
        var ids = new List<string>();
        foreach (var item in items)
        {
            switch (item)
            {
                case ElementRef el:
                    ids.Add(el.Id);
                    break;
                case RelationshipRef rel:
                    ids.Add(rel.SourceId);
                    ids.Add(rel.TargetId);
                    break;
                case DiffItem di:
                    var observed = di.Actual ?? di.Model;
                    if (observed is not null)
                        ids.Add(observed.Id);
                    break;
            }
        }
        return ids.Distinct().ToList();
    }
}
