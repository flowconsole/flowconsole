using FlowConsole.Rules.Core.Diagnostics;
using FlowConsole.Rules.Core.Model;
using YamlDotNet.Core;
using YamlDotNet.RepresentationModel;

namespace FlowConsole.Rules.Core.Ingest;

/// <summary>
/// Phase 2: Validates a parsed YAML document against the RuleFile schema.
/// Checks required fields, types, enum values, unknown fields, empty arrays,
/// and family-specific shape constraints. Builds the RuleFile model on success.
/// </summary>
internal sealed class SchemaValidator
{
    private static readonly HashSet<string> TopLevelFields = ["apiVersion", "kind", "rules"];

    private static readonly HashSet<string> BaseFields =
    [
        "id", "name", "kind", "target", "severity", "blocking",
        "description", "enabled", "tags", "sourceFamilies",
        "where", "let", "assert", "message"
    ];

    private static readonly HashSet<string> ElementFields =
    [
        ..BaseFields, "subject", "mode", "changeKinds"
    ];

    private static readonly HashSet<string> FlowFields =
    [
        ..BaseFields, "from", "to", "via", "viaMode", "mode", "maxDepth", "allowCycles"
    ];

    private static readonly HashSet<string> SelectorFields =
    [
        "entity", "kinds", "tagsAny", "tagsAll", "name",
        "technology", "sourceFamilies", "properties", "where"
    ];

    private static readonly HashSet<string> TextMatcherFieldSet = ["equals", "contains", "matches"];
    private static readonly HashSet<string> PropMatcherFieldSet = ["equals", "in", "matches"];

    private static readonly string[] KindValues = ["element", "flow"];
    private static readonly string[] TargetValues = ["model", "actual", "diff"];
    private static readonly string[] SeverityValues = ["info", "warning", "error", "critical"];
    private static readonly string[] EntityValues = ["elements", "relationships", "diffItems"];
    private static readonly string[] ElementModeValues = ["perItem", "aggregate"];
    private static readonly string[] FlowModeValues = ["perPath", "aggregate"];
    private static readonly string[] ChangeKindValues = ["added", "removed", "changed", "unmatchedModel", "unmatchedActual"];
    private static readonly string[] ViaModeValues = ["include", "exclude"];
    private static readonly string[] SourceFamilyValues = ["code", "infra", "import"];

    // YAML 1.1 boolean literals (unquoted)
    private static readonly HashSet<string> BoolTrue =
        ["true", "True", "TRUE", "yes", "Yes", "YES", "on", "On", "ON"];

    private static readonly HashSet<string> BoolFalse =
        ["false", "False", "FALSE", "no", "No", "NO", "off", "Off", "OFF"];

    public SchemaValidationResult Validate(YamlMappingNode document, string filePath)
    {
        var diags = new List<Diagnostic>();

        CheckUnknown(document, "/", TopLevelFields, diags);

        var rulesChild = RuleFileParser.GetChild(document, "rules");
        if (rulesChild == null)
        {
            AddMissing(diags, "/", "rules");
            return Fail(diags);
        }

        if (rulesChild is not YamlSequenceNode rulesSeq)
        {
            AddTypeMismatch(diags, "/rules", "array", rulesChild);
            return Fail(diags);
        }

        if (rulesSeq.Children.Count == 0)
        {
            AddEmptyArray(diags, "/rules", rulesSeq);
            return Fail(diags);
        }

        var rules = new List<Rule>();
        for (int i = 0; i < rulesSeq.Children.Count; i++)
        {
            if (rulesSeq.Children[i] is not YamlMappingNode ruleMapping)
            {
                AddTypeMismatch(diags, $"/rules/{i}", "object", rulesSeq.Children[i]);
                continue;
            }

            var rule = ValidateRule(ruleMapping, $"/rules/{i}", diags);
            if (rule != null)
                rules.Add(rule);
        }

        if (diags.Any(d => d.Level == DiagnosticLevel.Error))
            return Fail(diags);

        return new SchemaValidationResult(
            new RuleFile("rules.flowconsole.tech/v1alpha1", "RuleFile", rules),
            diags);
    }

    private Rule? ValidateRule(YamlMappingNode m, string path, List<Diagnostic> diags)
    {
        int before = diags.Count;

        // Required string fields
        var id = ReqString(m, "id", path, diags);
        var name = ReqString(m, "name", path, diags);
        var assertStr = ReqString(m, "assert", path, diags);
        var message = ReqString(m, "message", path, diags);

        // Required enum fields
        var kindStr = ReqEnum(m, "kind", path, KindValues, diags);
        var targetStr = ReqEnum(m, "target", path, TargetValues, diags);
        var severityStr = ReqEnum(m, "severity", path, SeverityValues, diags);

        // Required boolean
        var blocking = ReqBool(m, "blocking", path, diags);

        if (id == null || name == null || assertStr == null || message == null ||
            kindStr == null || targetStr == null || severityStr == null || blocking == null)
            return null;

        var kind = kindStr == "element" ? RuleKind.Element : RuleKind.Flow;
        var target = targetStr switch
        {
            "model" => RuleTarget.Model,
            "diff" => RuleTarget.Diff,
            _ => RuleTarget.Actual
        };
        var severity = severityStr switch
        {
            "info" => Severity.Info,
            "warning" => Severity.Warning,
            "critical" => Severity.Critical,
            _ => Severity.Error
        };

        // Unknown fields check (kind-specific)
        var known = kind == RuleKind.Element ? ElementFields : FlowFields;
        CheckUnknown(m, path, known, diags);

        // Optional common fields
        var description = OptString(m, "description", path, diags);
        var enabled = OptBool(m, "enabled", path, diags);
        var tags = OptStringArray(m, "tags", path, diags);
        var sourceFamilies = OptSourceFamilies(m, "sourceFamilies", path, diags);
        var where = OptString(m, "where", path, diags);
        var let = OptLetMap(m, "let", path, diags);

        // Family-specific
        Selector? subject = null;
        ElementMode? mode = null;
        IReadOnlyList<ChangeKind>? changeKinds = null;
        Selector? from = null, to = null, via = null;
        ViaMode? viaMode = null;
        FlowMode? flowMode = null;
        int? maxDepth = null;
        bool? allowCycles = null;

        if (kind == RuleKind.Element)
        {
            // Subject required
            var subjectChild = RuleFileParser.GetChild(m, "subject");
            if (subjectChild == null)
            {
                AddFamilyShape(diags, path, "Element rules require a 'subject' field.", m);
            }
            else if (subjectChild is not YamlMappingNode subjectMapping)
            {
                AddTypeMismatch(diags, $"{path}/subject", "object", subjectChild);
            }
            else
            {
                subject = ValidateSelector(subjectMapping, $"{path}/subject", diags);
            }

            // Element mode
            var modeStr = OptEnum(m, "mode", path, ElementModeValues, diags);
            if (modeStr != null)
                mode = modeStr == "perItem" ? ElementMode.PerItem : ElementMode.Aggregate;

            // changeKinds
            changeKinds = OptChangeKinds(m, "changeKinds", path, diags);
        }
        else // Flow
        {
            // from required
            var fromChild = RuleFileParser.GetChild(m, "from");
            if (fromChild == null)
            {
                AddFamilyShape(diags, path, "Flow rules require a 'from' field.", m);
            }
            else if (fromChild is not YamlMappingNode fromMapping)
            {
                AddTypeMismatch(diags, $"{path}/from", "object", fromChild);
            }
            else
            {
                from = ValidateSelector(fromMapping, $"{path}/from", diags);
            }

            // to required
            var toChild = RuleFileParser.GetChild(m, "to");
            if (toChild == null)
            {
                AddFamilyShape(diags, path, "Flow rules require a 'to' field.", m);
            }
            else if (toChild is not YamlMappingNode toMapping)
            {
                AddTypeMismatch(diags, $"{path}/to", "object", toChild);
            }
            else
            {
                to = ValidateSelector(toMapping, $"{path}/to", diags);
            }

            // Optional via
            var viaChild = RuleFileParser.GetChild(m, "via");
            if (viaChild is YamlMappingNode viaMapping)
                via = ValidateSelector(viaMapping, $"{path}/via", diags);
            else if (viaChild != null)
                AddTypeMismatch(diags, $"{path}/via", "object", viaChild);

            // viaMode
            var viaModeStr = OptEnum(m, "viaMode", path, ViaModeValues, diags);
            if (viaModeStr != null)
                viaMode = viaModeStr == "include" ? Model.ViaMode.Include : Model.ViaMode.Exclude;

            // Flow mode
            var flowModeStr = OptEnum(m, "mode", path, FlowModeValues, diags);
            if (flowModeStr != null)
                flowMode = flowModeStr == "perPath" ? Model.FlowMode.PerPath : Model.FlowMode.Aggregate;

            // maxDepth (capped at 100 to prevent stack overflow in DFS)
            maxDepth = OptInt(m, "maxDepth", path, diags);
            if (maxDepth is > 100)
            {
                diags.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_SCHEMA_TYPE_MISMATCH,
                    Phase = DiagnosticPhase.Schema,
                    Level = DiagnosticLevel.Error,
                    Path = $"{path}.maxDepth",
                    Message = $"maxDepth must be <= 100, got {maxDepth}",
                    Hint = "Reduce maxDepth to prevent excessive path search depth"
                });
            }

            // allowCycles
            allowCycles = OptBool(m, "allowCycles", path, diags);
        }

        if (diags.Count(d => d.Level == DiagnosticLevel.Error) >
            diags.Take(before).Count(d => d.Level == DiagnosticLevel.Error))
            return null;

        return new Rule
        {
            Id = id,
            Name = name,
            Kind = kind,
            Target = target,
            Severity = severity,
            Blocking = blocking.Value,
            Assert = assertStr,
            Message = message,
            Description = description,
            Enabled = enabled,
            Tags = tags,
            SourceFamilies = sourceFamilies,
            Where = where,
            Let = let,
            Subject = subject,
            Mode = mode,
            ChangeKinds = changeKinds,
            From = from,
            To = to,
            Via = via,
            ViaMode = viaMode,
            FlowMode = flowMode,
            MaxDepth = maxDepth,
            AllowCycles = allowCycles,
        };
    }

    private Selector? ValidateSelector(YamlMappingNode m, string path, List<Diagnostic> diags)
    {
        CheckUnknown(m, path, SelectorFields, diags);

        var entityStr = ReqEnum(m, "entity", path, EntityValues, diags);
        if (entityStr == null) return null;

        var entity = entityStr switch
        {
            "elements" => EntityType.Elements,
            "relationships" => EntityType.Relationships,
            _ => EntityType.DiffItems
        };

        var kinds = OptStringArray(m, "kinds", path, diags);
        var tagsAny = OptStringArray(m, "tagsAny", path, diags);
        var tagsAll = OptStringArray(m, "tagsAll", path, diags);
        var nameMatcher = OptTextMatcher(m, "name", path, diags);
        var techMatcher = OptTextMatcher(m, "technology", path, diags);
        var sourceFamilies = OptSourceFamilies(m, "sourceFamilies", path, diags);
        var properties = OptProperties(m, "properties", path, diags);
        var where = OptString(m, "where", path, diags);

        return new Selector
        {
            Entity = entity,
            Kinds = kinds,
            TagsAny = tagsAny,
            TagsAll = tagsAll,
            Name = nameMatcher,
            Technology = techMatcher,
            SourceFamilies = sourceFamilies,
            Properties = properties,
            Where = where
        };
    }

    // ── Helper: require string ──────────────────────────────────────────

    private string? ReqString(YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null)
        {
            AddMissing(diags, path, field);
            return null;
        }

        if (node is not YamlScalarNode scalar)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "string", node);
            return null;
        }

        // Accept any scalar as string (including unquoted booleans/ints in string context)
        if (string.IsNullOrEmpty(scalar.Value))
        {
            AddMissing(diags, path, field, scalar);
            return null;
        }

        return scalar.Value;
    }

    private string? OptString(YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null) return null;

        if (node is not YamlScalarNode scalar)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "string", node);
            return null;
        }

        return scalar.Value;
    }

    // ── Helper: require/optional enum ───────────────────────────────────

    private string? ReqEnum(YamlMappingNode m, string field, string path, string[] allowed, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null)
        {
            AddMissing(diags, path, field);
            return null;
        }

        if (node is not YamlScalarNode scalar || scalar.Value == null)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "string", node);
            return null;
        }

        if (!allowed.Contains(scalar.Value))
        {
            AddInvalidEnum(diags, $"{path}/{field}", scalar.Value, allowed, scalar);
            return null;
        }

        return scalar.Value;
    }

    private string? OptEnum(YamlMappingNode m, string field, string path, string[] allowed, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null) return null;

        if (node is not YamlScalarNode scalar || scalar.Value == null)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "string", node);
            return null;
        }

        if (!allowed.Contains(scalar.Value))
        {
            AddInvalidEnum(diags, $"{path}/{field}", scalar.Value, allowed, scalar);
            return null;
        }

        return scalar.Value;
    }

    // ── Helper: require/optional boolean ────────────────────────────────

    private bool? ReqBool(YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null)
        {
            AddMissing(diags, path, field);
            return null;
        }

        if (node is not YamlScalarNode scalar)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "boolean", node);
            return null;
        }

        var boolVal = ParseBool(scalar);
        if (boolVal == null)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "boolean", scalar);
            return null;
        }

        return boolVal;
    }

    private bool? OptBool(YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null) return null;

        if (node is not YamlScalarNode scalar)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "boolean", node);
            return null;
        }

        var boolVal = ParseBool(scalar);
        if (boolVal == null)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "boolean", scalar);
            return null;
        }

        return boolVal;
    }

    // ── Helper: optional integer ────────────────────────────────────────

    private int? OptInt(YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null) return null;

        if (node is not YamlScalarNode scalar)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "integer", node);
            return null;
        }

        if (scalar.Style is ScalarStyle.DoubleQuoted or ScalarStyle.SingleQuoted ||
            !int.TryParse(scalar.Value, out var intVal))
        {
            AddTypeMismatch(diags, $"{path}/{field}", "integer", scalar);
            return null;
        }

        return intVal;
    }

    // ── Helper: optional string array ───────────────────────────────────

    private IReadOnlyList<string>? OptStringArray(YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null) return null;

        if (node is not YamlSequenceNode seq)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "array", node);
            return null;
        }

        if (seq.Children.Count == 0)
        {
            AddEmptyArray(diags, $"{path}/{field}", seq);
            return null;
        }

        var result = new List<string>();
        for (int i = 0; i < seq.Children.Count; i++)
        {
            if (seq.Children[i] is not YamlScalarNode scalar || string.IsNullOrEmpty(scalar.Value))
            {
                AddTypeMismatch(diags, $"{path}/{field}/{i}", "non-empty string", seq.Children[i]);
                continue;
            }

            result.Add(scalar.Value);
        }

        return result;
    }

    // ── Helper: source families array ───────────────────────────────────

    private IReadOnlyList<SourceFamily>? OptSourceFamilies(
        YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null) return null;

        if (node is not YamlSequenceNode seq)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "array", node);
            return null;
        }

        if (seq.Children.Count == 0)
        {
            AddEmptyArray(diags, $"{path}/{field}", seq);
            return null;
        }

        var result = new List<SourceFamily>();
        for (int i = 0; i < seq.Children.Count; i++)
        {
            if (seq.Children[i] is not YamlScalarNode scalar || scalar.Value == null)
            {
                AddTypeMismatch(diags, $"{path}/{field}/{i}", "string", seq.Children[i]);
                continue;
            }

            if (!SourceFamilyValues.Contains(scalar.Value))
            {
                AddInvalidEnum(diags, $"{path}/{field}/{i}", scalar.Value, SourceFamilyValues, scalar);
                continue;
            }

            result.Add(scalar.Value switch
            {
                "code" => SourceFamily.Code,
                "infra" => SourceFamily.Infra,
                _ => SourceFamily.Import
            });
        }

        return result;
    }

    // ── Helper: change kinds array ──────────────────────────────────────

    private IReadOnlyList<ChangeKind>? OptChangeKinds(
        YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null) return null;

        if (node is not YamlSequenceNode seq)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "array", node);
            return null;
        }

        if (seq.Children.Count == 0)
        {
            AddEmptyArray(diags, $"{path}/{field}", seq);
            return null;
        }

        var result = new List<ChangeKind>();
        for (int i = 0; i < seq.Children.Count; i++)
        {
            if (seq.Children[i] is not YamlScalarNode scalar || scalar.Value == null)
            {
                AddTypeMismatch(diags, $"{path}/{field}/{i}", "string", seq.Children[i]);
                continue;
            }

            if (!ChangeKindValues.Contains(scalar.Value))
            {
                AddInvalidEnum(diags, $"{path}/{field}/{i}", scalar.Value, ChangeKindValues, scalar);
                continue;
            }

            result.Add(scalar.Value switch
            {
                "added" => ChangeKind.Added,
                "removed" => ChangeKind.Removed,
                "changed" => ChangeKind.Changed,
                "unmatchedModel" => ChangeKind.UnmatchedModel,
                _ => ChangeKind.UnmatchedActual
            });
        }

        return result;
    }

    // ── Helper: let map ─────────────────────────────────────────────────

    private IReadOnlyDictionary<string, string>? OptLetMap(
        YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var node = RuleFileParser.GetChild(m, field);
        if (node == null) return null;

        if (node is not YamlMappingNode letMapping)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "object", node);
            return null;
        }

        if (letMapping.Children.Count == 0)
        {
            AddEmptyArray(diags, $"{path}/{field}", letMapping);
            return null;
        }

        var result = new Dictionary<string, string>();
        foreach (var entry in letMapping.Children)
        {
            if (entry.Key is not YamlScalarNode keyNode || string.IsNullOrEmpty(keyNode.Value))
                continue;

            if (entry.Value is not YamlScalarNode valueNode || string.IsNullOrEmpty(valueNode.Value))
            {
                AddTypeMismatch(diags, $"{path}/{field}/{keyNode.Value}", "non-empty string", entry.Value);
                continue;
            }

            result[keyNode.Value] = valueNode.Value;
        }

        return result;
    }

    // ── Helper: text matcher ────────────────────────────────────────────

    private TextMatcher? OptTextMatcher(YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var child = RuleFileParser.GetChild(m, field);
        if (child == null) return null;

        if (child is not YamlMappingNode textMapping)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "object", child);
            return null;
        }

        CheckUnknown(textMapping, $"{path}/{field}", TextMatcherFieldSet, diags);

        var eq = OptString(textMapping, "equals", $"{path}/{field}", diags);
        var contains = OptString(textMapping, "contains", $"{path}/{field}", diags);
        var matches = OptString(textMapping, "matches", $"{path}/{field}", diags);

        if (eq == null && contains == null && matches == null)
        {
            diags.Add(new Diagnostic
            {
                Code = DiagnosticCodes.RF_SCHEMA_MISSING_REQUIRED_FIELD,
                Phase = DiagnosticPhase.Schema,
                Level = DiagnosticLevel.Error,
                Path = $"{path}/{field}",
                SourceRange = RuleFileParser.ToSourceRange(textMapping),
                Message = $"Text matcher '{field}' must have at least one of: equals, contains, matches."
            });
            return null;
        }

        return new TextMatcher { ExactEquals = eq, Contains = contains, Matches = matches };
    }

    // ── Helper: properties map ──────────────────────────────────────────

    private IReadOnlyDictionary<string, PropertyMatcher>? OptProperties(
        YamlMappingNode m, string field, string path, List<Diagnostic> diags)
    {
        var child = RuleFileParser.GetChild(m, field);
        if (child == null) return null;

        if (child is not YamlMappingNode propsMapping)
        {
            AddTypeMismatch(diags, $"{path}/{field}", "object", child);
            return null;
        }

        if (propsMapping.Children.Count == 0)
        {
            AddEmptyArray(diags, $"{path}/{field}", propsMapping);
            return null;
        }

        var result = new Dictionary<string, PropertyMatcher>();
        foreach (var entry in propsMapping.Children)
        {
            if (entry.Key is not YamlScalarNode keyNode || string.IsNullOrEmpty(keyNode.Value))
                continue;

            var ppath = $"{path}/{field}/{keyNode.Value}";

            if (entry.Value is not YamlMappingNode matcherMapping)
            {
                AddTypeMismatch(diags, ppath, "object", entry.Value);
                continue;
            }

            CheckUnknown(matcherMapping, ppath, PropMatcherFieldSet, diags);

            var eq = OptString(matcherMapping, "equals", ppath, diags);
            var inList = OptStringArray(matcherMapping, "in", ppath, diags);
            var matches = OptString(matcherMapping, "matches", ppath, diags);

            result[keyNode.Value] = new PropertyMatcher { ExactEquals = eq, In = inList, Matches = matches };
        }

        return result.Count > 0 ? result : null;
    }

    private static bool? ParseBool(YamlScalarNode node)
    {
        if (node.Value == null) return null;
        if (node.Style is ScalarStyle.DoubleQuoted or ScalarStyle.SingleQuoted)
            return null;
        if (BoolTrue.Contains(node.Value)) return true;
        if (BoolFalse.Contains(node.Value)) return false;
        return null;
    }

    private void CheckUnknown(YamlMappingNode m, string path, HashSet<string> known, List<Diagnostic> diags)
    {
        foreach (var entry in m.Children)
        {
            if (entry.Key is YamlScalarNode keyNode && keyNode.Value != null &&
                !known.Contains(keyNode.Value))
            {
                diags.Add(new Diagnostic
                {
                    Code = DiagnosticCodes.RF_SCHEMA_UNKNOWN_FIELD,
                    Phase = DiagnosticPhase.Schema,
                    Level = DiagnosticLevel.Error,
                    Path = $"{path}/{keyNode.Value}",
                    SourceRange = RuleFileParser.ToSourceRange(keyNode),
                    Message = $"Unknown field '{keyNode.Value}'."
                });
            }
        }
    }

    private static void AddMissing(List<Diagnostic> diags, string path, string field, YamlNode? node = null)
    {
        diags.Add(new Diagnostic
        {
            Code = DiagnosticCodes.RF_SCHEMA_MISSING_REQUIRED_FIELD,
            Phase = DiagnosticPhase.Schema,
            Level = DiagnosticLevel.Error,
            Path = $"{path}/{field}",
            SourceRange = node != null ? RuleFileParser.ToSourceRange(node) : null,
            Message = $"Required field '{field}' is missing."
        });
    }

    private static void AddTypeMismatch(List<Diagnostic> diags, string path, string expected, YamlNode node)
    {
        diags.Add(new Diagnostic
        {
            Code = DiagnosticCodes.RF_SCHEMA_TYPE_MISMATCH,
            Phase = DiagnosticPhase.Schema,
            Level = DiagnosticLevel.Error,
            Path = path,
            SourceRange = RuleFileParser.ToSourceRange(node),
            Message = $"Expected {expected}, got {NodeTypeName(node)}."
        });
    }

    private static void AddInvalidEnum(
        List<Diagnostic> diags, string path, string value, string[] allowed, YamlNode node)
    {
        diags.Add(new Diagnostic
        {
            Code = DiagnosticCodes.RF_SCHEMA_INVALID_ENUM_VALUE,
            Phase = DiagnosticPhase.Schema,
            Level = DiagnosticLevel.Error,
            Path = path,
            SourceRange = RuleFileParser.ToSourceRange(node),
            Message = $"Invalid value '{value}'. Allowed: {string.Join(", ", allowed)}."
        });
    }

    private static void AddEmptyArray(List<Diagnostic> diags, string path, YamlNode node)
    {
        diags.Add(new Diagnostic
        {
            Code = DiagnosticCodes.RF_SCHEMA_EMPTY_ARRAY,
            Phase = DiagnosticPhase.Schema,
            Level = DiagnosticLevel.Error,
            Path = path,
            SourceRange = RuleFileParser.ToSourceRange(node),
            Message = "Array must not be empty."
        });
    }

    private static void AddFamilyShape(List<Diagnostic> diags, string path, string message, YamlNode node)
    {
        diags.Add(new Diagnostic
        {
            Code = DiagnosticCodes.RF_SCHEMA_FAMILY_SHAPE_VIOLATION,
            Phase = DiagnosticPhase.Schema,
            Level = DiagnosticLevel.Error,
            Path = path,
            SourceRange = RuleFileParser.ToSourceRange(node),
            Message = message
        });
    }

    private static string NodeTypeName(YamlNode node) => node switch
    {
        YamlScalarNode s when s.Value == null => "null",
        YamlScalarNode s when ParseBoolStatic(s) != null => "boolean",
        YamlScalarNode s when s.Style is not (ScalarStyle.DoubleQuoted or ScalarStyle.SingleQuoted)
                             && int.TryParse(s.Value, out _) => "integer",
        YamlScalarNode => "string",
        YamlSequenceNode => "array",
        YamlMappingNode => "object",
        _ => "unknown"
    };

    private static bool? ParseBoolStatic(YamlScalarNode node)
    {
        if (node.Value == null) return null;
        if (node.Style is ScalarStyle.DoubleQuoted or ScalarStyle.SingleQuoted) return null;
        if (BoolTrue.Contains(node.Value)) return true;
        if (BoolFalse.Contains(node.Value)) return false;
        return null;
    }

    private static SchemaValidationResult Fail(IReadOnlyList<Diagnostic> diags) =>
        new(null, diags);
}

internal sealed record SchemaValidationResult(
    RuleFile? RuleFile,
    IReadOnlyList<Diagnostic> Diagnostics);
