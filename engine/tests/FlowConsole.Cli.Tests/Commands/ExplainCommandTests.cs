using FlowConsole.Cli.Commands;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Engine.Default;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class ExplainCommandTests : IDisposable
{
    private readonly string _tempRoot;

    public ExplainCommandTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-explain-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void Explain_KnownRule_ExitsZero_PrintsDescription()
    {
        var output = CaptureConsoleOutput(() =>
        {
            var exitCode = RunExplain("no-orphan-elements", null);
            exitCode.Should().Be(0);
        });

        output.Should().Contain("Rule: no-orphan-elements");
        output.Should().Contain("Name:");
        output.Should().Contain("Severity:");
        output.Should().Contain("Assert:");
        output.Should().Contain("Message:");
    }

    [Fact]
    public void Explain_UnknownRule_ExitsTwo()
    {
        var exitCode = RunExplain("nonexistent-rule-id", null);

        exitCode.Should().Be(2);
    }

    [Fact]
    public void Explain_MaxCoupling_ShowsDescription()
    {
        var output = CaptureConsoleOutput(() =>
        {
            var exitCode = RunExplain("max-coupling", null);
            exitCode.Should().Be(0);
        });

        output.Should().Contain("Rule: max-coupling");
        output.Should().Contain("Maximum coupling threshold");
        output.Should().Contain("Let:");
    }

    [Fact]
    public void Explain_Finding_ValidIndex_ExitsZero()
    {
        var findingsPath = Path.Combine(_tempRoot, "findings.json");
        File.WriteAllText(findingsPath, """
            {
              "executedAt": "2026-04-20T10:00:00Z",
              "ruleCount": 1,
              "passedCount": 0,
              "failedCount": 1,
              "findings": [
                {
                  "ruleId": "test-rule",
                  "ruleName": "Test Rule",
                  "severity": "error",
                  "blocking": false,
                  "message": "Something failed",
                  "elementIds": ["svc-1", "svc-2"]
                }
              ],
              "errors": []
            }
            """);

        var output = CaptureConsoleOutput(() =>
        {
            var exitCode = RunExplain("1", findingsPath);
            exitCode.Should().Be(0);
        });

        output.Should().Contain("Finding #1:");
        output.Should().Contain("test-rule");
        output.Should().Contain("Something failed");
        output.Should().Contain("svc-1");
    }

    [Fact]
    public void Explain_Finding_IndexOutOfRange_ExitsTwo()
    {
        var findingsPath = Path.Combine(_tempRoot, "findings-small.json");
        File.WriteAllText(findingsPath, """
            {
              "findings": [
                {
                  "ruleId": "r1",
                  "ruleName": "Rule 1",
                  "severity": "info",
                  "blocking": false,
                  "message": "msg",
                  "elementIds": []
                }
              ]
            }
            """);

        var exitCode = RunExplain("5", findingsPath);

        exitCode.Should().Be(2);
    }

    [Fact]
    public void Explain_Finding_MissingFile_ExitsTwo()
    {
        var exitCode = RunExplain("1", Path.Combine(_tempRoot, "no-such-file.json"));

        exitCode.Should().Be(2);
    }

    [Fact]
    public void Explain_Finding_InvalidJson_ExitsTwo()
    {
        var badPath = Path.Combine(_tempRoot, "bad.json");
        File.WriteAllText(badPath, "not json");

        var exitCode = RunExplain("1", badPath);

        exitCode.Should().Be(2);
    }

    private int RunExplain(string ruleIdOrIndex, string? findingFile)
    {
        var helper = new HelperRegistry();
        var compiler = new DefaultExpressionCompiler(helper);
        var builtIn = new BuiltInRuleLoader(compiler, helper);

        var command = new ExplainCommand(builtIn);
        var context = TestHelper.CreateContext("explain");
        var settings = new ExplainSettings
        {
            RuleIdOrIndex = ruleIdOrIndex,
            FindingFile = findingFile
        };

        return command.Execute(context, settings);
    }

    private static string CaptureConsoleOutput(Action action)
    {
        var originalOut = Console.Out;
        using var sw = new StringWriter();
        Console.SetOut(sw);
        try
        {
            action();
            return sw.ToString();
        }
        finally
        {
            Console.SetOut(originalOut);
        }
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempRoot))
        {
            try { Directory.Delete(_tempRoot, true); }
            catch { /* best-effort cleanup */ }
        }
    }
}
