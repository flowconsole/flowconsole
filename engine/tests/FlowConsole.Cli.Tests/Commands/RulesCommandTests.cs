using FlowConsole.Cli.Commands;
using FlowConsole.Rules.Core.Abstractions;
using FlowConsole.Rules.Engine.Default;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class RulesCommandTests : IDisposable
{
    private readonly string _tempRoot;

    public RulesCommandTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-rules-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void RulesList_ExitsZero_ListsBuiltInRules()
    {
        var output = CaptureConsoleOutput(() =>
        {
            var exitCode = RunRulesList();
            exitCode.Should().Be(0);
        });

        // Should list the built-in rules
        output.Should().Contain("ID");
        output.Should().Contain("SEVERITY");
        output.Should().Contain("rules total");
    }

    [Fact]
    public void RulesList_ContainsKnownRules()
    {
        var output = CaptureConsoleOutput(() =>
        {
            RunRulesList();
        });

        // These are the 4 known built-in rules
        output.Should().Contain("no-orphan-elements");
        output.Should().Contain("max-coupling");
        output.Should().Contain("no-cyclic-dependencies");
        output.Should().Contain("no-shared-database");
    }

    [Fact]
    public void RulesExport_CreatesYamlFiles()
    {
        var outputDir = Path.Combine(_tempRoot, "exported");

        var exitCode = RunRulesExport(outputDir);

        exitCode.Should().Be(0);
        Directory.Exists(outputDir).Should().BeTrue();

        var files = Directory.GetFiles(outputDir, "*.rule.yaml");
        files.Should().NotBeEmpty("should export at least one rule file");

        // Verify exported files are valid YAML (parseable)
        foreach (var file in files)
        {
            var content = File.ReadAllText(file);
            content.Should().Contain("apiVersion:");
            content.Should().Contain("kind: RuleFile");
            content.Should().Contain("rules:");
        }
    }

    [Fact]
    public void RulesExport_ExportedFilesParseByRuleEngine()
    {
        var outputDir = Path.Combine(_tempRoot, "exported-parse");

        RunRulesExport(outputDir);

        var helper = new HelperRegistry();
        var compiler = new DefaultExpressionCompiler(helper);
        var pipeline = new FlowConsole.Rules.Core.Ingest.IngestPipeline(compiler, helper);

        var files = Directory.GetFiles(outputDir, "*.rule.yaml");
        foreach (var file in files)
        {
            var content = File.ReadAllText(file);
            var result = pipeline.RunFull(content, file);

            result.RuleFile.Should().NotBeNull($"exported file {Path.GetFileName(file)} should parse successfully");
            result.RuleFile!.Rules.Should().NotBeEmpty($"exported file {Path.GetFileName(file)} should contain rules");
        }
    }

    private int RunRulesList()
    {
        var helper = new HelperRegistry();
        var compiler = new DefaultExpressionCompiler(helper);
        var builtIn = new BuiltInRuleLoader(compiler, helper);

        var command = new RulesListCommand(builtIn);
        var context = TestHelper.CreateContext("rules list");
        var settings = new RulesListSettings();

        return command.Execute(context, settings);
    }

    private int RunRulesExport(string outputDir)
    {
        var command = new RulesExportCommand();
        var context = TestHelper.CreateContext("rules export");
        var settings = new RulesExportSettings { OutputDir = outputDir };

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
