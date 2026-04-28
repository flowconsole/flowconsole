using System.Text;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Rules.Core.Execution;
using Spectre.Console;

namespace FlowConsole.Cli.Formatters;

internal sealed class HumanFormatter : IFindingsFormatter
{
    public string Format(RuleExecutionResult result, bool includeTrace)
    {
        var sb = new StringBuilder();

        if (result.Findings.Count == 0 && result.Errors.Count == 0)
        {
            sb.AppendLine($"[bold green]✓[/] All rules passed ({result.PassedCount} rules, 0 findings)");
            return sb.ToString();
        }

        var grouped = result.Findings
            .GroupBy(f => f.Severity)
            .OrderByDescending(g => SharedHelpers.SeverityOrder(g.Key));

        foreach (var group in grouped)
        {
            var (icon, color) = SeverityStyle(group.Key);
            foreach (var finding in group)
            {
                sb.AppendLine($"[{color}]{icon}[/] [[{group.Key}]] [bold]{Markup.Escape(finding.RuleId)}[/]: {Markup.Escape(finding.Message)}");
                if (finding.ElementIds.Count > 0)
                    sb.AppendLine($"    [grey]elements: {Markup.Escape(string.Join(", ", finding.ElementIds))}[/]");
            }
        }

        if (result.Errors.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("[bold red]Errors:[/]");
            foreach (var error in result.Errors)
                sb.AppendLine($"  [[{Markup.Escape(error.Code)}]] [bold]{Markup.Escape(error.RuleId)}[/]: {Markup.Escape(error.Message)}");
        }

        sb.AppendLine();
        sb.AppendLine($"[bold]Summary:[/] {result.RuleCount} rules, [bold green]{result.PassedCount} passed[/], [bold red]{result.FailedCount} failed[/], {result.Findings.Count} findings, {result.Errors.Count} errors");

        return sb.ToString();
    }

    private static (string Icon, string Color) SeverityStyle(string severity) => severity switch
    {
        "critical" => ("X", "bold red"),
        "error" => ("E", "bold red"),
        "warning" => ("W", "bold yellow"),
        "info" => ("I", "bold cyan"),
        _ => ("?", "grey"),
    };
}
