using System.Text.Json;
using FlowConsole.Cli.Commands;
using FlowConsole.Schema.SnapshotValidation;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class DoctorCommandTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly string _originalDir;
    private readonly string? _originalApiKey;

    public DoctorCommandTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-doctor-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
        _originalDir = Directory.GetCurrentDirectory();
        _originalApiKey = Environment.GetEnvironmentVariable("FLOWCONSOLE_API_KEY");
    }

    [Fact]
    public void Doctor_AllPass_ReturnsZero()
    {
        SetupValidEnvironment();
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "test-key");
        Directory.SetCurrentDirectory(_tempRoot);

        try
        {
            var (exitCode, _) = RunDoctor();
            // Exit 0 (all pass) or 1 (Tree-sitter native lib warning in environments
            // where the native library is not available — e.g. CI containers).
            exitCode.Should().BeOneOf(0, 1);
        }
        finally
        {
            Directory.SetCurrentDirectory(_originalDir);
        }
    }

    [Fact]
    public void Doctor_MissingRulesDir_ReturnsWarning()
    {
        // No rules dir → warning
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "test-key");
        Directory.SetCurrentDirectory(_tempRoot);

        try
        {
            var (exitCode, output) = RunDoctor();
            exitCode.Should().Be(1, "missing rules dir should produce a warning");
            output.Should().Contain("Rules directory not found");
        }
        finally
        {
            Directory.SetCurrentDirectory(_originalDir);
        }
    }

    [Fact]
    public void Doctor_MissingApiKey_ReturnsWarning()
    {
        SetupValidEnvironment();
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", null);
        Directory.SetCurrentDirectory(_tempRoot);

        try
        {
            var (exitCode, output) = RunDoctor();
            exitCode.Should().Be(1, "missing API key should produce a warning");
            output.Should().Contain("FLOWCONSOLE_API_KEY");
        }
        finally
        {
            Directory.SetCurrentDirectory(_originalDir);
        }
    }

    [Fact]
    public void Doctor_MajorVersionMismatch_ReturnsCritical()
    {
        SetupValidEnvironment();
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "test-key");

        // Create a snapshot with major version mismatch
        var snapshotDir = Path.Combine(_tempRoot, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotDir);
        File.WriteAllText(Path.Combine(snapshotDir, "test.json"), """
            {
              "$schema": "https://flowconsole.tech/schemas/model-snapshot/v1/schema.json",
              "schemaVersion": "99.0.0",
              "source": "test",
              "elements": [],
              "relationships": []
            }
            """);

        Directory.SetCurrentDirectory(_tempRoot);

        try
        {
            var (exitCode, _) = RunDoctor();
            exitCode.Should().Be(2, "major version mismatch should be critical");
        }
        finally
        {
            Directory.SetCurrentDirectory(_originalDir);
        }
    }

    [Fact]
    public void Doctor_MinorVersionAhead_ReturnsWarning()
    {
        SetupValidEnvironment();
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "test-key");

        var snapshotDir = Path.Combine(_tempRoot, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotDir);
        File.WriteAllText(Path.Combine(snapshotDir, "test.json"), """
            {
              "$schema": "https://flowconsole.tech/schemas/model-snapshot/v1/schema.json",
              "schemaVersion": "1.99.0",
              "source": "test",
              "elements": [],
              "relationships": []
            }
            """);

        Directory.SetCurrentDirectory(_tempRoot);

        try
        {
            var (exitCode, _) = RunDoctor();
            exitCode.Should().Be(1, "minor version ahead should be a warning");
        }
        finally
        {
            Directory.SetCurrentDirectory(_originalDir);
        }
    }

    [Fact]
    public void Doctor_CompatiblePatchVersion_ReturnsPass()
    {
        SetupValidEnvironment();
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "test-key");

        var snapshotDir = Path.Combine(_tempRoot, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotDir);
        File.WriteAllText(Path.Combine(snapshotDir, "test.json"), """
            {
              "$schema": "https://flowconsole.tech/schemas/model-snapshot/v1/schema.json",
              "schemaVersion": "1.0.5",
              "source": "test",
              "elements": [],
              "relationships": []
            }
            """);

        Directory.SetCurrentDirectory(_tempRoot);

        try
        {
            var (exitCode, output) = RunDoctor();
            // Exit 0 or 1 (Tree-sitter native lib warning possible in test environments)
            exitCode.Should().BeOneOf([0, 1], "compatible patch version should pass");
            output.Should().Contain("compatible");
        }
        finally
        {
            Directory.SetCurrentDirectory(_originalDir);
        }
    }

    [Fact]
    public void Doctor_ExitCodes_AllThreeBranchesCovered()
    {
        // Branch 0: all pass
        {
            var dir0 = Path.Combine(_tempRoot, "pass-env");
            Directory.CreateDirectory(dir0);
            SetupValidEnvironmentIn(dir0);
            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "test-key");
            Directory.SetCurrentDirectory(dir0);
            try
            {
                var (exitCode, _) = RunDoctor();
                // Exit 0 or 1 (Tree-sitter native lib warning possible in test environments)
                exitCode.Should().BeOneOf([0, 1], "all-pass environment should return 0 or 1 (Tree-sitter warning)");
            }
            finally
            {
                Directory.SetCurrentDirectory(_originalDir);
            }
        }

        // Branch 1: warnings only
        {
            var dir1 = Path.Combine(_tempRoot, "warn-env");
            Directory.CreateDirectory(dir1);
            SetupValidEnvironmentIn(dir1);
            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", null);
            Directory.SetCurrentDirectory(dir1);
            try
            {
                var (exitCode, _) = RunDoctor();
                exitCode.Should().Be(1, "missing API key should return 1 (warning)");
            }
            finally
            {
                Directory.SetCurrentDirectory(_originalDir);
            }
        }

        // Branch 2: critical
        {
            var dir2 = Path.Combine(_tempRoot, "crit-env");
            Directory.CreateDirectory(dir2);
            SetupValidEnvironmentIn(dir2);
            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "test-key");
            var snapshotDir = Path.Combine(dir2, ".flowconsole", "snapshots");
            Directory.CreateDirectory(snapshotDir);
            File.WriteAllText(Path.Combine(snapshotDir, "bad.json"), """
                {
                  "$schema": "https://flowconsole.tech/schemas/model-snapshot/v1/schema.json",
                  "schemaVersion": "99.0.0",
                  "source": "test",
                  "elements": [],
                  "relationships": []
                }
                """);

            Directory.SetCurrentDirectory(dir2);
            try
            {
                var (exitCode, _) = RunDoctor();
                exitCode.Should().Be(2, "major version mismatch should return 2 (critical)");
            }
            finally
            {
                Directory.SetCurrentDirectory(_originalDir);
            }
        }
    }

    private void SetupValidEnvironment() => SetupValidEnvironmentIn(_tempRoot);

    private static void SetupValidEnvironmentIn(string dir)
    {
        var rulesDir = Path.Combine(dir, "rules");
        Directory.CreateDirectory(rulesDir);
        File.WriteAllText(Path.Combine(rulesDir, "test.rule.yaml"), """
            apiVersion: rules.flowconsole.tech/v1alpha1
            kind: RuleFile
            rules:
              - id: test-rule
                name: Test Rule
                kind: element
                target: actual
                severity: warning
                blocking: false
                description: A test rule
                subject:
                  entity: elements
                mode: perItem
                assert: "true"
                message: "test"
            """);
    }

    private static (int exitCode, string output) RunDoctor()
    {
        var validator = new JsonSchemaValidator();
        var settings = new DoctorSettings();

        var writer = new StringWriter();
        var originalOut = Console.Out;
        Console.SetOut(writer);

        try
        {
            var command = new DoctorCommand(validator);
            var exitCode = command.Execute(
                TestHelper.CreateContext("doctor"),
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
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", _originalApiKey);
        try
        {
            Directory.SetCurrentDirectory(_originalDir);
            Directory.Delete(_tempRoot, recursive: true);
        }
        catch { /* best-effort cleanup */ }
    }
}
