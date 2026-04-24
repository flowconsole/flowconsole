using System.Text;
using System.Xml;
using FlowConsole.Rules.Core.Execution;

namespace FlowConsole.Cli.Formatters;

/// <summary>
/// JUnit XML output formatter. Each rule is a test case; findings are failures.
/// </summary>
internal sealed class JunitFormatter : IFindingsFormatter
{
    public string Format(RuleExecutionResult result, bool includeTrace)
    {
        var sb = new StringBuilder();
        using var writer = XmlWriter.Create(sb, new XmlWriterSettings
        {
            Indent = true,
            Encoding = Encoding.UTF8,
            OmitXmlDeclaration = false
        });

        writer.WriteStartDocument();
        writer.WriteStartElement("testsuites");

        // Group findings by rule
        var findingsByRule = result.Findings.GroupBy(f => f.RuleId).ToList();
        var errorsByRule = result.Errors.GroupBy(e => e.RuleId).ToList();

        var failedRuleIds = findingsByRule.Select(g => g.Key)
            .Union(errorsByRule.Select(g => g.Key))
            .ToHashSet();

        // tests = only emitted testcases (failed + errored rules); passed rules are reflected in the summary attributes
        var errorOnlyRuleCount = errorsByRule.Count(g => !findingsByRule.Any(f => f.Key == g.Key));
        var emittedTestcases = findingsByRule.Count + errorOnlyRuleCount;
        writer.WriteStartElement("testsuite");
        writer.WriteAttributeString("name", "fc-validate");
        writer.WriteAttributeString("tests", result.RuleCount.ToString());
        writer.WriteAttributeString("failures", result.FailedCount.ToString());
        writer.WriteAttributeString("errors", errorOnlyRuleCount.ToString());
        writer.WriteAttributeString("skipped", "0");
        writer.WriteAttributeString("timestamp", result.ExecutedAt.ToString("O"));

        foreach (var group in findingsByRule)
        {
            writer.WriteStartElement("testcase");
            writer.WriteAttributeString("name", group.Key);
            writer.WriteAttributeString("classname", "fc-validate");

            foreach (var finding in group)
            {
                writer.WriteStartElement("failure");
                writer.WriteAttributeString("message", finding.Message);
                writer.WriteAttributeString("type", finding.Severity);
                if (finding.ElementIds.Count > 0)
                    writer.WriteString($"Elements: {string.Join(", ", finding.ElementIds)}");
                writer.WriteEndElement(); // failure
            }

            writer.WriteEndElement(); // testcase
        }

        foreach (var group in errorsByRule)
        {
            if (findingsByRule.Any(f => f.Key == group.Key))
                continue; // Already written as testcase with findings

            writer.WriteStartElement("testcase");
            writer.WriteAttributeString("name", group.Key);
            writer.WriteAttributeString("classname", "fc-validate");

            foreach (var error in group)
            {
                writer.WriteStartElement("error");
                writer.WriteAttributeString("message", error.Message);
                writer.WriteAttributeString("type", error.Code);
                writer.WriteEndElement(); // error
            }

            writer.WriteEndElement(); // testcase
        }

        writer.WriteEndElement(); // testsuite
        writer.WriteEndElement(); // testsuites
        writer.WriteEndDocument();
        writer.Flush();

        return sb.ToString();
    }
}
