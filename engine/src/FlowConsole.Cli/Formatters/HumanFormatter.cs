using System.Text;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Cli.Formatters;

/// <summary>
/// Human-readable colored output via Spectre.Console markup (rendered to plain text).
/// Groups findings by severity, shows summary.
/// </summary>
internal sealed class HumanFormatter : IFindingsFormatter
{
    public string Format(RuleExecutionResult result, bool includeTrace)
    {
        var sb = new StringBuilder();

        if (result.Findings.Count == 0 && result.Errors.Count == 0)
        {
            sb.AppendLine($"All rules passed ({result.PassedCount} rules, 0 findings)");
            return sb.ToString();
        }

        // Group findings by severity
        var grouped = result.Findings
            .GroupBy(f => f.Severity)
            .OrderByDescending(g => SharedHelpers.SeverityOrder(g.Key));

        foreach (var group in grouped)
        {
            var icon = SeverityIcon(group.Key);
            foreach (var finding in group)
            {
                sb.AppendLine($"{icon} [{group.Key}] {finding.RuleId}: {finding.Message}");
                if (finding.ElementIds.Count > 0)
                    sb.AppendLine($"    elements: {string.Join(", ", finding.ElementIds)}");
            }
        }

        if (result.Errors.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Errors:");
            foreach (var error in result.Errors)
                sb.AppendLine($"  [{error.Code}] {error.RuleId}: {error.Message}");
        }

        sb.AppendLine();
        sb.AppendLine($"Summary: {result.RuleCount} rules, {result.PassedCount} passed, {result.FailedCount} failed, {result.Findings.Count} findings, {result.Errors.Count} errors");

        return sb.ToString();
    }

    private static string SeverityIcon(string severity) => severity switch
    {
        "critical" => "X",
        "error" => "E",
        "warning" => "W",
        "info" => "I",
        _ => "?"
    };
}
