using System.Text.Json;
using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Synth;
using FlowConsole.Cli.Tests.Synth;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class BuildCommandTests : IDisposable
{
    private readonly string _tempRoot;

    private static readonly string ValidSnapshot = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.1.0",
          "source": "Git",
          "elements": [
            {
              "id": "webapp",
              "kind": "Service",
              "name": "Web App",
              "source": "Git"
            },
            {
              "id": "api",
              "kind": "Service",
              "name": "API",
              "source": "Git"
            }
          ],
          "relationships": [
            {
              "id": "webapp--calls-->api",
              "sourceId": "webapp",
              "targetId": "api",
              "kind": "Calls"
            }
          ]
        }
        """;

    public BuildCommandTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-build-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void Build_NoConfigNoCommand_ExitsTwo_WithHint()
    {
        var projectDir = CreateProjectDir("no-config");
        // No .flowconsole.yaml, no --command

        var (exitCode, _, stderr) = RunBuild(projectDir);

        exitCode.Should().Be(2);
        stderr.Should().Contain("build.command not configured");
    }

    [Fact]
    public void Build_NoConfigNoCommand_HintContainsSuggestion_WhenMainTsExists()
    {
        var projectDir = CreateProjectDir("hint-ts");
        File.WriteAllText(Path.Combine(projectDir, "main.ts"), "// entry");

        var (exitCode, _, stderr) = RunBuild(projectDir);

        exitCode.Should().Be(2);
        stderr.Should().Contain("node main.ts");
    }

    [Fact]
    public void Build_CommandOverridesConfig_OutputWrittenToFile()
    {
        var projectDir = CreateProjectDir("cmd-override");
        CreateConfig(projectDir, command: "echo wrong");

        var outputPath = Path.Combine(projectDir, "output.json");
        // Write snapshot to a file the echo command will cat
        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);

        var (exitCode, _, _) = RunBuild(
            projectDir,
            command: $"cat {snapshotFile}",
            output: outputPath);

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();

        var json = File.ReadAllText(outputPath);
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.TryGetProperty("$schema", out _).Should().BeTrue();
    }

    [Fact]
    public void Build_SubprocessExitNonZero_ExitsThree()
    {
        var projectDir = CreateProjectDir("bad-exit");

        var (exitCode, _, stderr) = RunBuild(
            projectDir,
            command: "exit 42");

        exitCode.Should().Be(3);
        stderr.Should().Contain("exited with code");
    }

    [Fact]
    public void Build_SubprocessEmptyOutput_ExitsThree()
    {
        var projectDir = CreateProjectDir("empty-output");

        var (exitCode, _, stderr) = RunBuild(
            projectDir,
            command: "printf ''");

        exitCode.Should().Be(3);
        stderr.Should().Contain("no output");
    }

    [Fact]
    public void Build_SubprocessInvalidJson_ExitsThree()
    {
        var projectDir = CreateProjectDir("bad-json");

        var (exitCode, _, stderr) = RunBuild(
            projectDir,
            command: "echo not-json-at-all");

        exitCode.Should().Be(3);
        stderr.Should().Contain("not valid JSON");
    }

    [Fact]
    public void Build_ConfigBuildCommand_Works()
    {
        var projectDir = CreateProjectDir("config-cmd");
        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);
        CreateConfig(projectDir, command: $"cat {snapshotFile}");

        var outputPath = Path.Combine(projectDir, "output.json");
        var (exitCode, _, _) = RunBuild(projectDir, output: outputPath);

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();
    }

    [Fact]
    public void Build_OutputCanonicalNormalized_ByteStable()
    {
        var projectDir = CreateProjectDir("canonical");
        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);

        var output1 = Path.Combine(projectDir, "out1.json");
        var output2 = Path.Combine(projectDir, "out2.json");

        RunBuild(projectDir, command: $"cat {snapshotFile}", output: output1);
        RunBuild(projectDir, command: $"cat {snapshotFile}", output: output2);

        var content1 = File.ReadAllText(output1);
        var content2 = File.ReadAllText(output2);

        content1.Should().Be(content2, "two calls on the same input should produce byte-identical output");
    }

    [Fact]
    public void Build_ConfigCwd_UsedAsWorkingDirectory()
    {
        var projectDir = CreateProjectDir("cwd-test");
        var subDir = Path.Combine(projectDir, "arch");
        Directory.CreateDirectory(subDir);

        var snapshotFile = Path.Combine(subDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);

        CreateConfig(projectDir, command: "cat snapshot.json", cwd: "./arch");

        var outputPath = Path.Combine(projectDir, "output.json");
        var (exitCode, _, _) = RunBuild(projectDir, output: outputPath, useCwdFromConfig: true);

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();
    }

    [Fact]
    public void Build_RequireConfirmWithoutDiffAgainstLive_ExitsTwo()
    {
        var projectDir = CreateProjectDir("require-confirm-no-diff");
        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);
        CreateConfig(projectDir, command: $"cat {snapshotFile}");

        var (exitCode, _, stderr) = RunBuild(
            projectDir,
            requireConfirm: true);

        exitCode.Should().Be(2);
        stderr.Should().Contain("--require-confirm requires --diff-against-live");
    }

    [Fact]
    public void Build_DiffAgainstLive_NetworkError_ExitsFour()
    {
        var projectDir = CreateProjectDir("diff-network-error");
        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);
        CreateConfig(projectDir, command: $"cat {snapshotFile}", apiUrl: "http://localhost:1", modelId: "test-model");

        // Use a fetcher that simulates network error
        var fakeFetcher = new FakeLiveDiffFetcher(
            new LiveDiffFetcher.FetchResult(false, null, null, "Network error: Connection refused"));

        var (exitCode, _, stderr) = RunBuild(
            projectDir,
            diffAgainstLive: true,
            liveDiffFetcher: fakeFetcher);

        exitCode.Should().Be(4);
        stderr.Should().Contain("Network error");
    }

    [Fact]
    public void Build_DiffAgainstLive_IdenticalSnapshots_ShowsNoChanges()
    {
        var projectDir = CreateProjectDir("diff-identical");
        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);
        CreateConfig(projectDir, command: $"cat {snapshotFile}", apiUrl: "http://api.test", modelId: "m1");

        // Remote returns same snapshot (no flows in either)
        using var remoteDoc = JsonDocument.Parse(ValidSnapshot);
        var fakeFetcher = new FakeLiveDiffFetcher(
            new LiveDiffFetcher.FetchResult(true, remoteDoc, 200, null));

        var (exitCode, stdout, _) = RunBuild(
            projectDir,
            diffAgainstLive: true,
            liveDiffFetcher: fakeFetcher);

        exitCode.Should().Be(0);
        stdout.Should().Contain("no changes");
    }

    [Fact]
    public void Build_DiffAgainstLive_NewFlowAdded_ShowsAddedFlow()
    {
        var projectDir = CreateProjectDir("diff-new-flow");

        var localSnapshotWithFlow = """
            {
              "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
              "schemaVersion": "1.1.0",
              "source": "Git",
              "elements": [
                { "id": "webapp", "kind": "Service", "name": "Web App", "source": "Git" },
                { "id": "api", "kind": "Service", "name": "API", "source": "Git" }
              ],
              "relationships": [
                { "id": "webapp--calls-->api", "sourceId": "webapp", "targetId": "api", "kind": "Calls" }
              ],
              "flows": [
                {
                  "id": "login-flow",
                  "name": "Login Flow",
                  "steps": [
                    { "sourceElementId": "webapp", "relationshipId": "webapp--calls-->api", "label": "POST /login" }
                  ]
                }
              ]
            }
            """;

        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, localSnapshotWithFlow);
        CreateConfig(projectDir, command: $"cat {snapshotFile}", apiUrl: "http://api.test", modelId: "m1");

        // Remote has no flows
        using var remoteDoc = JsonDocument.Parse(ValidSnapshot);
        var fakeFetcher = new FakeLiveDiffFetcher(
            new LiveDiffFetcher.FetchResult(true, remoteDoc, 200, null));

        var (exitCode, stdout, _) = RunBuild(
            projectDir,
            diffAgainstLive: true,
            liveDiffFetcher: fakeFetcher);

        exitCode.Should().Be(0);
        stdout.Should().Contain("+ flow");
        stdout.Should().Contain("Login Flow");
        stdout.Should().Contain("+1 added");
    }

    [Fact]
    public void Build_DiffAgainstLive_FlowStepReordered_ShowsChanged()
    {
        var projectDir = CreateProjectDir("diff-reorder");

        var localSnapshot = """
            {
              "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
              "schemaVersion": "1.1.0",
              "source": "Git",
              "elements": [
                { "id": "a", "kind": "Service", "name": "A", "source": "Git" },
                { "id": "b", "kind": "Service", "name": "B", "source": "Git" }
              ],
              "relationships": [],
              "flows": [
                {
                  "id": "f1", "name": "Flow 1",
                  "steps": [
                    { "sourceElementId": "b", "label": "step-B" },
                    { "sourceElementId": "a", "label": "step-A" }
                  ]
                }
              ]
            }
            """;

        var remoteSnapshot = """
            {
              "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
              "schemaVersion": "1.1.0",
              "source": "Git",
              "elements": [
                { "id": "a", "kind": "Service", "name": "A", "source": "Git" },
                { "id": "b", "kind": "Service", "name": "B", "source": "Git" }
              ],
              "relationships": [],
              "flows": [
                {
                  "id": "f1", "name": "Flow 1",
                  "steps": [
                    { "sourceElementId": "a", "label": "step-A" },
                    { "sourceElementId": "b", "label": "step-B" }
                  ]
                }
              ]
            }
            """;

        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, localSnapshot);
        CreateConfig(projectDir, command: $"cat {snapshotFile}", apiUrl: "http://api.test", modelId: "m1");

        using var remoteDoc = JsonDocument.Parse(remoteSnapshot);
        var fakeFetcher = new FakeLiveDiffFetcher(
            new LiveDiffFetcher.FetchResult(true, remoteDoc, 200, null));

        var (exitCode, stdout, _) = RunBuild(
            projectDir,
            diffAgainstLive: true,
            liveDiffFetcher: fakeFetcher);

        exitCode.Should().Be(0);
        stdout.Should().Contain("~ flow");
        stdout.Should().Contain("~1 changed");
    }

    [Fact]
    public void Build_RequireConfirm_UserTypesN_ExitsZero()
    {
        var projectDir = CreateProjectDir("confirm-n");

        var localSnapshot = """
            {
              "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
              "schemaVersion": "1.1.0",
              "source": "Git",
              "elements": [
                { "id": "a", "kind": "Service", "name": "A", "source": "Git" }
              ],
              "relationships": [],
              "flows": [
                { "id": "f1", "name": "New Flow", "steps": [ { "sourceElementId": "a" } ] }
              ]
            }
            """;

        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, localSnapshot);
        CreateConfig(projectDir, command: $"cat {snapshotFile}", apiUrl: "http://api.test", modelId: "m1");

        // Remote has no flows
        using var remoteDoc = JsonDocument.Parse("""
            {
              "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
              "schemaVersion": "1.1.0",
              "source": "Git",
              "elements": [
                { "id": "a", "kind": "Service", "name": "A", "source": "Git" }
              ],
              "relationships": []
            }
            """);
        var fakeFetcher = new FakeLiveDiffFetcher(
            new LiveDiffFetcher.FetchResult(true, remoteDoc, 200, null));

        var (exitCode, stdout, _) = RunBuild(
            projectDir,
            diffAgainstLive: true,
            requireConfirm: true,
            liveDiffFetcher: fakeFetcher,
            consoleInput: new StringReader("n\n"));

        exitCode.Should().Be(0);
        stdout.Should().Contain("Apply?");
    }

    [Fact]
    public void Build_DiffAgainstLive_MissingApiUrl_ExitsTwo()
    {
        var projectDir = CreateProjectDir("diff-no-api-url");
        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);
        // Config without api_url
        CreateConfig(projectDir, command: $"cat {snapshotFile}");

        var (exitCode, _, stderr) = RunBuild(
            projectDir,
            diffAgainstLive: true);

        exitCode.Should().Be(2);
        stderr.Should().Contain("api_url not configured");
    }

    [Fact]
    public void Build_DiffAgainstLive_MissingModelId_ExitsTwo()
    {
        var projectDir = CreateProjectDir("diff-no-model-id");
        var snapshotFile = Path.Combine(projectDir, "snapshot.json");
        File.WriteAllText(snapshotFile, ValidSnapshot);
        // Config with api_url but no model_id
        CreateConfig(projectDir, command: $"cat {snapshotFile}", apiUrl: "http://api.test");

        var (exitCode, _, stderr) = RunBuild(
            projectDir,
            diffAgainstLive: true);

        exitCode.Should().Be(2);
        stderr.Should().Contain("model_id not configured");
    }

    private string CreateProjectDir(string name)
    {
        var dir = Path.Combine(_tempRoot, name);
        Directory.CreateDirectory(dir);
        return dir;
    }

    private static void CreateConfig(
        string dir,
        string? command = null,
        string? cwd = null,
        string? apiUrl = null,
        string? modelId = null)
    {
        var yaml = "# FlowConsole configuration\nrules_dir: ./rules\n";
        if (apiUrl is not null)
            yaml += $"api_url: {apiUrl}\n";
        if (modelId is not null)
            yaml += $"model_id: {modelId}\n";
        if (command is not null || cwd is not null)
        {
            yaml += "build:\n";
            if (command is not null)
                yaml += $"  command: \"{command}\"\n";
            if (cwd is not null)
                yaml += $"  cwd: \"{cwd}\"\n";
        }
        File.WriteAllText(Path.Combine(dir, ".flowconsole.yaml"), yaml);
    }

    private (int exitCode, string stdout, string stderr) RunBuild(
        string projectDir,
        string? command = null,
        string? output = null,
        string? cwd = null,
        bool useCwdFromConfig = false,
        bool diffAgainstLive = false,
        bool requireConfirm = false,
        LiveDiffFetcher? liveDiffFetcher = null,
        TextReader? consoleInput = null)
    {
        var atomicWriter = new AtomicFileWriter();
        var outputRouter = new OutputRouter(atomicWriter);
        var ctHolder = new CancellationTokenHolder(CancellationToken.None);
        var shellRunner = new ShellOutRunner();

        var buildCommand = new BuildCommand(
            atomicWriter, outputRouter, ctHolder, shellRunner,
            liveDiffFetcher, consoleInput);
        var context = TestHelper.CreateContext("build");

        var configPath = Path.Combine(projectDir, ".flowconsole.yaml");
        var settings = new BuildCommandSettings
        {
            ConfigPath = File.Exists(configPath) ? configPath : null,
            Cwd = useCwdFromConfig ? null : (cwd ?? projectDir),
            Command = command,
            Output = output,
            DiffAgainstLive = diffAgainstLive,
            RequireConfirm = requireConfirm,
        };

        var stdoutWriter = new StringWriter();
        var stderrWriter = new StringWriter();
        var originalOut = Console.Out;
        var originalErr = Console.Error;

        Console.SetOut(stdoutWriter);
        Console.SetError(stderrWriter);

        try
        {
            var exitCode = buildCommand.Execute(context, settings);
            return (exitCode, stdoutWriter.ToString(), stderrWriter.ToString());
        }
        finally
        {
            Console.SetOut(originalOut);
            Console.SetError(originalErr);
        }
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); }
        catch { /* best-effort */ }
    }
}
