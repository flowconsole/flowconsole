using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class InitCommandTests : IDisposable
{
    private readonly string _tempRoot;

    public InitCommandTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-init-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void Init_CreatesConfigAndDirectories()
    {
        var targetDir = Path.Combine(_tempRoot, "project");
        Directory.CreateDirectory(targetDir);

        var (exitCode, _) = RunInit(targetDir);

        exitCode.Should().Be(0);
        File.Exists(Path.Combine(targetDir, ".flowconsole.yaml")).Should().BeTrue();
        Directory.Exists(Path.Combine(targetDir, ".flowconsole", "snapshots")).Should().BeTrue();
        Directory.Exists(Path.Combine(targetDir, ".flowconsole", "findings")).Should().BeTrue();
        Directory.Exists(Path.Combine(targetDir, ".flowconsole", "logs")).Should().BeTrue();
        Directory.Exists(Path.Combine(targetDir, "rules")).Should().BeTrue();
    }

    [Fact]
    public void Init_CreatesFlowConsoleDirWithoutCache()
    {
        var targetDir = Path.Combine(_tempRoot, "no-cache");
        Directory.CreateDirectory(targetDir);

        RunInit(targetDir);

        // Per Decision #30: no cache/ directory
        Directory.Exists(Path.Combine(targetDir, ".flowconsole", "cache")).Should().BeFalse();
        // But snapshots, findings, logs should exist
        Directory.Exists(Path.Combine(targetDir, ".flowconsole", "snapshots")).Should().BeTrue();
        Directory.Exists(Path.Combine(targetDir, ".flowconsole", "findings")).Should().BeTrue();
        Directory.Exists(Path.Combine(targetDir, ".flowconsole", "logs")).Should().BeTrue();
    }

    [Fact]
    public void Init_CreatesSelfProtectionGitignore()
    {
        var targetDir = Path.Combine(_tempRoot, "gitignore-test");
        Directory.CreateDirectory(targetDir);

        RunInit(targetDir);

        var gitignorePath = Path.Combine(targetDir, ".flowconsole", ".gitignore");
        File.Exists(gitignorePath).Should().BeTrue();
        File.ReadAllText(gitignorePath).Should().Contain("*");
    }

    [Fact]
    public void Init_AppendsToProjectGitignore()
    {
        var targetDir = Path.Combine(_tempRoot, "gitignore-append");
        Directory.CreateDirectory(targetDir);
        File.WriteAllText(Path.Combine(targetDir, ".gitignore"), "node_modules/\n");

        RunInit(targetDir);

        var content = File.ReadAllText(Path.Combine(targetDir, ".gitignore"));
        content.Should().Contain("node_modules/");
        content.Should().Contain(".flowconsole/");
    }

    [Fact]
    public void Init_CreatesGitignoreIfMissing()
    {
        var targetDir = Path.Combine(_tempRoot, "no-gitignore");
        Directory.CreateDirectory(targetDir);

        RunInit(targetDir);

        var gitignorePath = Path.Combine(targetDir, ".gitignore");
        File.Exists(gitignorePath).Should().BeTrue();
        File.ReadAllText(gitignorePath).Should().Contain(".flowconsole/");
    }

    [Fact]
    public void Init_DoesNotDuplicateGitignoreEntry()
    {
        var targetDir = Path.Combine(_tempRoot, "dedup");
        Directory.CreateDirectory(targetDir);
        File.WriteAllText(Path.Combine(targetDir, ".gitignore"), ".flowconsole/\n");

        RunInit(targetDir, force: true);

        var content = File.ReadAllText(Path.Combine(targetDir, ".gitignore"));
        var count = content.Split(".flowconsole/").Length - 1;
        count.Should().Be(1, "should not duplicate .flowconsole/ entry");
    }

    [Fact]
    public void Init_DefaultDoesNotMutateReadme()
    {
        var targetDir = Path.Combine(_tempRoot, "readme-safe");
        Directory.CreateDirectory(targetDir);
        var readmePath = Path.Combine(targetDir, "README.md");
        var originalContent = "# My Project\n\nSome description.\n";
        File.WriteAllText(readmePath, originalContent);

        RunInit(targetDir);

        var afterContent = File.ReadAllText(readmePath);
        afterContent.Should().Be(originalContent, "fcon init should NOT mutate README.md by default");
    }

    [Fact]
    public void Init_UpdateReadmeOptInMutatesReadme()
    {
        var targetDir = Path.Combine(_tempRoot, "readme-update");
        Directory.CreateDirectory(targetDir);
        var readmePath = Path.Combine(targetDir, "README.md");
        File.WriteAllText(readmePath, "# My Project\n");

        RunInit(targetDir, updateReadme: true);

        var content = File.ReadAllText(readmePath);
        content.Should().Contain("fcon scan");
        content.Should().Contain("fcon validate");
        content.Should().Contain("<!-- flowconsole -->");
    }

    [Fact]
    public void Init_WithExamplesCreatesExampleSnapshot()
    {
        var targetDir = Path.Combine(_tempRoot, "examples");
        Directory.CreateDirectory(targetDir);

        RunInit(targetDir, withExamples: true);

        var examplePath = Path.Combine(targetDir, ".flowconsole", "snapshots", "example.json");
        File.Exists(examplePath).Should().BeTrue();
        var content = File.ReadAllText(examplePath);
        content.Should().Contain("\"$schema\"");
        content.Should().Contain("\"schemaVersion\"");
    }

    [Fact]
    public void Init_ExistingConfigWithoutForceReturnsError()
    {
        var targetDir = Path.Combine(_tempRoot, "existing");
        Directory.CreateDirectory(targetDir);
        File.WriteAllText(Path.Combine(targetDir, ".flowconsole.yaml"), "existing: true\n");

        var (exitCode, _) = RunInit(targetDir);

        exitCode.Should().Be(2);
    }

    [Fact]
    public void Init_ForceOverwritesExisting()
    {
        var targetDir = Path.Combine(_tempRoot, "force");
        Directory.CreateDirectory(targetDir);
        File.WriteAllText(Path.Combine(targetDir, ".flowconsole.yaml"), "existing: true\n");

        var (exitCode, _) = RunInit(targetDir, force: true);

        exitCode.Should().Be(0);
        var content = File.ReadAllText(Path.Combine(targetDir, ".flowconsole.yaml"));
        content.Should().Contain("rules_dir:");
    }

    [Fact]
    public void Init_ExportsBuiltInRules()
    {
        var targetDir = Path.Combine(_tempRoot, "rules-export");
        Directory.CreateDirectory(targetDir);

        RunInit(targetDir);

        var rulesDir = Path.Combine(targetDir, "rules");
        var ruleFiles = Directory.GetFiles(rulesDir, "*.rule.yaml");
        ruleFiles.Should().NotBeEmpty("built-in rules should be exported");
    }

    [Fact]
    public void ExtractRuleFileName_ExtractsCorrectName()
    {
        var result = SharedHelpers.ExtractRuleFileName(
            "FlowConsole.Rules.Engine.Default.BuiltInRules.no-orphan-elements.rule.yaml");
        result.Should().Be("no-orphan-elements.rule.yaml");
    }

    [Fact]
    public void Init_WithExamples_TypeScriptProject_PrefillsBuildCommand()
    {
        var targetDir = Path.Combine(_tempRoot, "ts-project");
        Directory.CreateDirectory(targetDir);
        File.WriteAllText(Path.Combine(targetDir, "main.ts"), "// entrypoint");

        RunInit(targetDir, withExamples: true);

        var content = File.ReadAllText(Path.Combine(targetDir, ".flowconsole.yaml"));
        content.Should().Contain("command: \"node main.ts\"");
        content.Should().Contain("output: \"stdout\"");
        content.Should().Contain("cwd: \"./\"");
    }

    [Fact]
    public void Init_WithExamples_CSharpProject_PrefillsBuildCommand()
    {
        var targetDir = Path.Combine(_tempRoot, "cs-project");
        Directory.CreateDirectory(targetDir);
        File.WriteAllText(Path.Combine(targetDir, "Program.cs"), "// entrypoint");

        RunInit(targetDir, withExamples: true);

        var content = File.ReadAllText(Path.Combine(targetDir, ".flowconsole.yaml"));
        content.Should().Contain("command: \"dotnet run --project ./arch\"");
        content.Should().Contain("output: \"stdout\"");
    }

    [Fact]
    public void Init_WithExamples_EmptyDir_GenericPlaceholder()
    {
        var targetDir = Path.Combine(_tempRoot, "empty-project");
        Directory.CreateDirectory(targetDir);

        RunInit(targetDir, withExamples: true);

        var content = File.ReadAllText(Path.Combine(targetDir, ".flowconsole.yaml"));
        content.Should().Contain("command: \"\"");
        content.Should().Contain("REQUIRED for fcon build");
    }

    [Fact]
    public void Init_NoFlag_EmptyCommandRegardlessOfCwd()
    {
        var targetDir = Path.Combine(_tempRoot, "no-flag-ts");
        Directory.CreateDirectory(targetDir);
        // Even with main.ts present, no --with-examples means no pre-fill
        File.WriteAllText(Path.Combine(targetDir, "main.ts"), "// entrypoint");

        RunInit(targetDir);

        var content = File.ReadAllText(Path.Combine(targetDir, ".flowconsole.yaml"));
        content.Should().Contain("command: \"\"");
        content.Should().Contain("REQUIRED for fcon build");
        // The command value must be empty — auto-detected command should NOT appear as the value
        content.Should().NotContain("command: \"node main.ts\"");
    }

    [Fact]
    public void Init_DefaultDoesNotMutateReadme_WithMainTs()
    {
        var targetDir = Path.Combine(_tempRoot, "readme-safe-ts");
        Directory.CreateDirectory(targetDir);
        File.WriteAllText(Path.Combine(targetDir, "main.ts"), "// entrypoint");
        var readmePath = Path.Combine(targetDir, "README.md");
        var originalContent = "# My Project\n\nSome description.\n";
        File.WriteAllText(readmePath, originalContent);

        RunInit(targetDir, withExamples: true);

        var afterContent = File.ReadAllText(readmePath);
        afterContent.Should().Be(originalContent, "fcon init --with-examples should NOT mutate README.md without --update-readme");
    }

    [Fact]
    public void Init_DefaultConfig_IncludesBuildSection()
    {
        var targetDir = Path.Combine(_tempRoot, "build-section");
        Directory.CreateDirectory(targetDir);

        RunInit(targetDir);

        var content = File.ReadAllText(Path.Combine(targetDir, ".flowconsole.yaml"));
        content.Should().Contain("build:");
        content.Should().Contain("command:");
    }

    [Fact]
    public void Init_ConfigDiscovery_MonorepoLayout()
    {
        // Create a parent dir with config, init in subdir should find parent config
        var rootDir = Path.Combine(_tempRoot, "monorepo");
        Directory.CreateDirectory(rootDir);
        File.WriteAllText(Path.Combine(rootDir, ".flowconsole.yaml"), "rules_dir: ./rules\n");

        var subDir = Path.Combine(rootDir, "services", "api");
        Directory.CreateDirectory(subDir);

        var found = ConfigDiscovery.FindConfigFile(subDir);
        found.Should().Be(Path.Combine(rootDir, ".flowconsole.yaml"));
    }

    private static (int exitCode, string output) RunInit(
        string directory,
        bool withExamples = false,
        bool force = false,
        bool updateReadme = false)
    {
        var settings = new InitSettings
        {
            Directory = directory,
            WithExamples = withExamples,
            Force = force,
            UpdateReadme = updateReadme,
        };

        var writer = new StringWriter();
        var originalOut = Console.Out;
        Console.SetOut(writer);

        try
        {
            var command = new InitCommand();
            var exitCode = command.Execute(
                TestHelper.CreateContext("init"),
                settings);
            return (exitCode, writer.ToString());
        }
        finally
        {
            Console.SetOut(originalOut);
        }
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); }
        catch { /* best-effort cleanup */ }
    }
}
