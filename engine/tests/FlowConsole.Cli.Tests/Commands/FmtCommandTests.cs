using System.Text.Json;
using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Schema.SnapshotValidation;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class FmtCommandTests : IDisposable
{
    private readonly string _tempRoot;

    private const string ValidSnapshot = """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [
            {
              "id": "b-service",
              "kind": "Service",
              "name": "B Service"
            },
            {
              "id": "a-service",
              "kind": "Service",
              "name": "A Service"
            }
          ],
          "relationships": [
            {
              "id": "b-calls-a",
              "sourceId": "b-service",
              "targetId": "a-service",
              "kind": "Calls"
            },
            {
              "id": "a-uses-b",
              "sourceId": "a-service",
              "targetId": "b-service",
              "kind": "Uses"
            }
          ]
        }
        """;

    public FmtCommandTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-fmt-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void Fmt_NormalizesKeyOrder_SortsElementsById()
    {
        var inputPath = Path.Combine(_tempRoot, "unsorted.json");
        File.WriteAllText(inputPath, ValidSnapshot);

        var outputPath = Path.Combine(_tempRoot, "formatted.json");
        var exitCode = RunFmt(inputPath, $"-o {outputPath}");

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();

        var json = File.ReadAllText(outputPath);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Check canonical key order: $schema first
        var properties = root.EnumerateObject().Select(p => p.Name).ToList();
        properties[0].Should().Be("$schema");
        properties[1].Should().Be("schemaVersion");
        properties[2].Should().Be("source");
        properties[3].Should().Be("elements");
        properties[4].Should().Be("relationships");

        // Elements sorted by id: a-service before b-service
        var elements = root.GetProperty("elements");
        elements[0].GetProperty("id").GetString().Should().Be("a-service");
        elements[1].GetProperty("id").GetString().Should().Be("b-service");

        // Relationships sorted by sourceId+targetId+kind
        var relationships = root.GetProperty("relationships");
        relationships[0].GetProperty("sourceId").GetString().Should().Be("a-service");
        relationships[1].GetProperty("sourceId").GetString().Should().Be("b-service");
    }

    [Fact]
    public void Fmt_CheckMode_NormalizedFile_ExitsZero()
    {
        // First normalize the file
        var inputPath = Path.Combine(_tempRoot, "check-normalized.json");
        File.WriteAllText(inputPath, ValidSnapshot);

        var normalizedPath = Path.Combine(_tempRoot, "check-normalized-out.json");
        RunFmt(inputPath, $"-o {normalizedPath}");

        // Now check the already-normalized file
        var exitCode = RunFmt(normalizedPath, "--check");

        exitCode.Should().Be(0);
    }

    [Fact]
    public void Fmt_CheckMode_NonNormalizedFile_ExitsOne()
    {
        var inputPath = Path.Combine(_tempRoot, "check-nonnormalized.json");
        File.WriteAllText(inputPath, ValidSnapshot);

        var exitCode = RunFmt(inputPath, "--check");

        exitCode.Should().Be(1);
    }

    [Fact]
    public void Fmt_InPlace_ModifiesFile()
    {
        var inputPath = Path.Combine(_tempRoot, "in-place.json");
        File.WriteAllText(inputPath, ValidSnapshot);

        var exitCode = RunFmt(inputPath, "");

        exitCode.Should().Be(0);

        var result = File.ReadAllText(inputPath);
        using var doc = JsonDocument.Parse(result);
        var elements = doc.RootElement.GetProperty("elements");
        // After normalization, a-service should be first
        elements[0].GetProperty("id").GetString().Should().Be("a-service");
    }

    [Fact]
    public void Fmt_Indent4_UsesCorrectIndentation()
    {
        var inputPath = Path.Combine(_tempRoot, "indent4.json");
        File.WriteAllText(inputPath, ValidSnapshot);

        var outputPath = Path.Combine(_tempRoot, "indent4-out.json");
        var exitCode = RunFmt(inputPath, $"--indent 4 -o {outputPath}");

        exitCode.Should().Be(0);
        var content = File.ReadAllText(outputPath);
        // Should use 4-space indentation
        content.Should().Contain("    \"$schema\"");
    }

    [Fact]
    public void Fmt_InvalidJson_ExitsTwo()
    {
        var inputPath = Path.Combine(_tempRoot, "invalid.json");
        File.WriteAllText(inputPath, "{ this is not valid json }}}");

        var exitCode = RunFmt(inputPath, "");

        exitCode.Should().Be(2);
    }

    [Fact]
    public void Fmt_FileNotFound_ExitsTwo()
    {
        var exitCode = RunFmt(Path.Combine(_tempRoot, "nonexistent.json"), "");

        exitCode.Should().Be(2);
    }

    [Fact]
    public void Fmt_SchemaValidationErrors_ExitsTwo()
    {
        var inputPath = Path.Combine(_tempRoot, "bad-schema.json");
        // Missing required fields
        File.WriteAllText(inputPath, """
            {
              "notASnapshot": true
            }
            """);

        var exitCode = RunFmt(inputPath, "");

        exitCode.Should().Be(2);
    }

    private int RunFmt(string input, string extraArgs)
    {
        var validator = new JsonSchemaValidator();
        var writer = new AtomicFileWriter();
        var ctHolder = new CancellationTokenHolder(CancellationToken.None);

        var command = new FmtCommand(validator, writer, ctHolder);
        var context = TestHelper.CreateContext("fmt");

        var args = extraArgs.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        var settings = new FmtSettings
        {
            Snapshot = input,
            Output = args.Contains("-o") ? args[Array.IndexOf(args, "-o") + 1] : null,
            Check = args.Contains("--check"),
            Indent = args.Contains("--indent") ? args[Array.IndexOf(args, "--indent") + 1] : "2"
        };

        return command.Execute(context, settings);
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
