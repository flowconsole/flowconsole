using System.ComponentModel;
using System.Text.Json;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Settings;
using FlowConsole.Rules.Core.Compiled;
using FlowConsole.Rules.Engine.Default;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class ExplainSettings : GlobalSettings
{
    [CommandArgument(0, "<rule-id-or-finding-index>")]
    [Description("Rule ID to explain, or finding index (with --finding)")]
    public string RuleIdOrIndex { get; init; } = string.Empty;

    [CommandOption("--finding <PATH>")]
    [Description("Path to findings JSON file (enables finding trace mode)")]
    public string? FindingFile { get; init; }
}

/// <summary>
/// Explains a rule or a specific finding trace.
/// </summary>
internal sealed class ExplainCommand : Command<ExplainSettings>
{
    private readonly BuiltInRuleLoader _builtInRuleLoader;

    public ExplainCommand(BuiltInRuleLoader builtInRuleLoader)
    {
        _builtInRuleLoader = builtInRuleLoader;
    }

    public override int Execute(CommandContext context, ExplainSettings settings)
    {
        if (settings.FindingFile is not null)
            return ExplainFinding(settings);

        return ExplainRule(settings.RuleIdOrIndex);
    }

    private int ExplainRule(string ruleId)
    {
        var builtIn = _builtInRuleLoader.GetBuiltInRules();
        if (builtIn is null)
        {
            CliConsole.Error("no built-in rules loaded");
            return 5;
        }

        var rule = builtIn.Rules.FirstOrDefault(r =>
            string.Equals(r.Id, ruleId, StringComparison.OrdinalIgnoreCase));

        if (rule is null)
        {
            CliConsole.Error($"rule '{ruleId}' not found");
            CliConsole.Info($"hint: use `fcon rules list` to see available rules");
            return 2;
        }

        PrintRule(rule);
        return 0;
    }

    private static void PrintRule(FlowConsoleRule rule)
    {
        Console.WriteLine($"Rule: {rule.Id}");
        Console.WriteLine($"Name: {rule.Name}");
        Console.WriteLine($"Kind: {rule.Kind.ToString().ToLowerInvariant()}");
        Console.WriteLine($"Target: {rule.Target.ToString().ToLowerInvariant()}");
        Console.WriteLine($"Severity: {rule.Severity.ToString().ToLowerInvariant()}");
        Console.WriteLine($"Blocking: {rule.Blocking}");
        Console.WriteLine($"Enabled: {rule.Enabled}");

        if (rule.Description is not null)
        {
            Console.WriteLine();
            Console.WriteLine($"Description:");
            Console.WriteLine($"  {rule.Description}");
        }

        if (rule.Tags is { Count: > 0 })
            Console.WriteLine($"Tags: {string.Join(", ", rule.Tags)}");

        Console.WriteLine();
        Console.WriteLine($"Assert: {rule.Assert.Source}");
        Console.WriteLine($"Message: {rule.Message.Source}");

        if (rule.Where is not null)
            Console.WriteLine($"Where: {rule.Where.Source}");

        if (rule.Let is { Count: > 0 })
        {
            Console.WriteLine("Let:");
            foreach (var (name, expr) in rule.Let)
                Console.WriteLine($"  {name}: {expr.Source}");
        }

        if (rule.Subject is not null)
        {
            Console.WriteLine();
            Console.WriteLine("Subject:");
            Console.WriteLine($"  entity: {rule.Subject.Entity.ToString().ToLowerInvariant()}");
            if (rule.Subject.Kinds is { Count: > 0 })
                Console.WriteLine($"  kinds: {string.Join(", ", rule.Subject.Kinds)}");
            if (rule.Subject.Where is not null)
                Console.WriteLine($"  where: {rule.Subject.Where.Source}");
        }

        if (rule.Mode is not null)
            Console.WriteLine($"Mode: {rule.Mode.ToString()!.ToLowerInvariant()}");
    }

    private static int ExplainFinding(ExplainSettings settings)
    {
        if (!File.Exists(settings.FindingFile))
        {
            CliConsole.Error($"findings file not found: {settings.FindingFile}");
            return 2;
        }

        if (!int.TryParse(settings.RuleIdOrIndex, out var index) || index < 1)
        {
            CliConsole.Error("--finding mode requires a 1-based finding index as the first argument");
            return 2;
        }

        string json;
        try
        {
            json = File.ReadAllText(settings.FindingFile);
        }
        catch (Exception ex)
        {
            CliConsole.Error($"cannot read findings file: {ex.Message}");
            return 2;
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException ex)
        {
            CliConsole.Error($"invalid JSON in findings file: {ex.Message}");
            return 2;
        }

        using (doc)
        {
            if (!doc.RootElement.TryGetProperty("findings", out var findingsArr) ||
                findingsArr.ValueKind != JsonValueKind.Array)
            {
                CliConsole.Error("findings file does not contain a 'findings' array");
                return 2;
            }

            var count = findingsArr.GetArrayLength();
            if (index > count)
            {
                CliConsole.Error($"finding index {index} out of range (1-{count})");
                return 2;
            }

            var finding = findingsArr[index - 1];

            Console.WriteLine($"Finding #{index}:");
            Console.WriteLine($"  Rule: {GetStr(finding, "ruleId")}");
            Console.WriteLine($"  Name: {GetStr(finding, "ruleName")}");
            Console.WriteLine($"  Severity: {GetStr(finding, "severity")}");
            Console.WriteLine($"  Message: {GetStr(finding, "message")}");

            if (finding.TryGetProperty("elementIds", out var ids) && ids.ValueKind == JsonValueKind.Array)
            {
                var idList = new List<string>();
                foreach (var id in ids.EnumerateArray())
                    if (id.ValueKind == JsonValueKind.String) idList.Add(id.GetString()!);
                if (idList.Count > 0)
                    Console.WriteLine($"  Elements: {string.Join(", ", idList)}");
            }

            Console.WriteLine();
            Console.WriteLine("(Trace requires findings generated with --include-trace)");
        }

        return 0;
    }

    private static string GetStr(JsonElement el, string prop)
        => el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString() ?? ""
            : "";
}
