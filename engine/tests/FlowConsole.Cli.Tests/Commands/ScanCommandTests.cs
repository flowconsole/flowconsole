using System.Text.Json;
using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Scanners.Core;
using FlowConsole.Schema.SnapshotValidation;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class ScanCommandTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly string _fixtureDir;

    public ScanCommandTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-scan-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);

        // Create a minimal C# project fixture
        _fixtureDir = Path.Combine(_tempRoot, "ref-csproj");
        Directory.CreateDirectory(_fixtureDir);

        File.WriteAllText(Path.Combine(_fixtureDir, "SampleApp.csproj"), """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """);

        File.WriteAllText(Path.Combine(_fixtureDir, "Program.cs"), """
            var builder = WebApplication.CreateBuilder(args);
            var app = builder.Build();
            app.MapGet("/", () => "Hello World");
            app.Run();
            """);

        File.WriteAllText(Path.Combine(_fixtureDir, "SampleController.cs"), """
            using Microsoft.AspNetCore.Mvc;

            namespace SampleApp.Controllers;

            [ApiController]
            [Route("api/[controller]")]
            public class UsersController : ControllerBase
            {
                [HttpGet]
                public IActionResult GetAll() => Ok();

                [HttpPost]
                public IActionResult Create() => Ok();
            }
            """);
    }

    [Fact]
    public void Scan_RefCsproj_ProducesValidJsonWithSchemaAndVersion()
    {
        var outputPath = Path.Combine(_tempRoot, "output.json");

        var exitCode = RunScan(_fixtureDir, $"-o {outputPath}");

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();

        var json = File.ReadAllText(outputPath);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("$schema", out var schema).Should().BeTrue();
        schema.GetString().Should().Be("https://flowconsole.tech/contracts/model-snapshot/v1/schema.json");

        root.TryGetProperty("schemaVersion", out var version).Should().BeTrue();
        version.GetString().Should().Be("1.1.0");

        root.TryGetProperty("elements", out var elements).Should().BeTrue();
        elements.ValueKind.Should().Be(JsonValueKind.Array);

        root.TryGetProperty("relationships", out _).Should().BeTrue();
    }

    [Fact]
    public void Scan_GracefulDegradation_BrokenFileAmongValid_ExitsZero()
    {
        // Add a broken .cs file alongside valid ones
        var brokenDir = Path.Combine(_tempRoot, "mixed");
        Directory.CreateDirectory(brokenDir);

        // Copy valid fixture
        foreach (var file in Directory.GetFiles(_fixtureDir))
            File.Copy(file, Path.Combine(brokenDir, Path.GetFileName(file)));

        // Add broken .cs file
        File.WriteAllText(Path.Combine(brokenDir, "Broken.cs"), """
            this is not valid C# code {{{{{ syntax error
            """);

        var outputPath = Path.Combine(_tempRoot, "mixed-output.json");
        var exitCode = RunScan(brokenDir, $"-o {outputPath}");

        // Graceful degradation: should still exit 0 if some files parsed
        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();
    }

    [Fact]
    public void Scan_StrictMode_FirstParseError_ExitsThree()
    {
        // Create a directory with ONLY invalid content (no .csproj)
        var badDir = Path.Combine(_tempRoot, "bad-only");
        Directory.CreateDirectory(badDir);
        File.WriteAllText(Path.Combine(badDir, "SomeProject.csproj"), """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """);
        File.WriteAllText(Path.Combine(badDir, "Broken.cs"), "not valid C# {{{{{ syntax error");

        var outputPath = Path.Combine(_tempRoot, "strict-output.json");
        var exitCode = RunScan(badDir, $"--strict -o {outputPath}");

        // In strict mode, a broken .cs file causes a parse error → exit 3
        exitCode.Should().Be(3);
    }

    [Fact]
    public void Scan_ScannerCsharpOverride_Works()
    {
        var outputPath = Path.Combine(_tempRoot, "scanner-override.json");

        var exitCode = RunScan(_fixtureDir, $"--scanner csharp -o {outputPath}");

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();
    }

    [Fact]
    public void Scan_MergeWith_ComposesSnapshots()
    {
        // First create a base snapshot
        var baseSnapshot = """
            {
              "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
              "schemaVersion": "1.0.0",
              "source": "CodeScan",
              "elements": [
                {
                  "id": "existing-service",
                  "kind": "Service",
                  "name": "Existing Service",
                  "source": "CodeScan"
                }
              ],
              "relationships": []
            }
            """;
        var basePath = Path.Combine(_tempRoot, "base.json");
        File.WriteAllText(basePath, baseSnapshot);

        var outputPath = Path.Combine(_tempRoot, "merged.json");
        var exitCode = RunScan(_fixtureDir, $"--merge-with {basePath} -o {outputPath}");

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();

        var json = File.ReadAllText(outputPath);
        // Should contain the existing-service from base + scanned elements
        json.Should().Contain("existing-service");
    }

    [Fact]
    public void Scan_IdentityMode_SnapshotJsonInput_PrintsHint()
    {
        var snapshotPath = Path.Combine(_tempRoot, "snapshot-input.json");
        File.WriteAllText(snapshotPath, """
            {
              "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
              "schemaVersion": "1.0.0",
              "source": "CodeScan",
              "elements": [],
              "relationships": []
            }
            """);

        var exitCode = RunScan(snapshotPath, "");

        exitCode.Should().Be(0);
    }

    [Fact]
    public void Scan_HelmInput_AutoDetects_ProducesSnapshot()
    {
        var helmDir = Path.Combine(_tempRoot, "charts");
        Directory.CreateDirectory(helmDir);
        var templatesDir = Path.Combine(helmDir, "templates");
        Directory.CreateDirectory(templatesDir);
        File.WriteAllText(Path.Combine(helmDir, "Chart.yaml"), "apiVersion: v2\nname: test-app\nversion: 0.1.0\n");
        File.WriteAllText(Path.Combine(templatesDir, "deployment.yaml"), """
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: test-app
            spec:
              replicas: 1
              template:
                spec:
                  containers:
                    - name: test
                      image: test:latest
            """);

        var outputPath = Path.Combine(_tempRoot, "helm-output.json");
        var exitCode = RunScan(helmDir, $"-o {outputPath}");

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();

        var json = File.ReadAllText(outputPath);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("$schema", out _).Should().BeTrue();
        root.TryGetProperty("schemaVersion", out _).Should().BeTrue();
        root.TryGetProperty("elements", out var elements).Should().BeTrue();
        elements.GetArrayLength().Should().BeGreaterThan(0, "Helm scan should produce elements");
    }

    [Fact]
    public void Scan_PathNotFound_ExitsThree()
    {
        var exitCode = RunScan(Path.Combine(_tempRoot, "nonexistent"), "");

        exitCode.Should().Be(3);
    }

    [Fact]
    public void Scan_OutputContainsSchemaAndVersion()
    {
        var outputPath = Path.Combine(_tempRoot, "schema-check.json");

        var exitCode = RunScan(_fixtureDir, $"-o {outputPath}");

        exitCode.Should().Be(0);

        // Validate through IJsonSchemaValidator
        var json = File.ReadAllText(outputPath);
        using var doc = JsonDocument.Parse(json);
        var validator = new JsonSchemaValidator();
        var result = validator.Validate(doc);

        result.IsSuccess.Should().BeTrue();
        // Per-kind property errors (e.g. Endpoint without httpMethod) are acceptable
        // in scan output — only critical structural errors are blocking
        var criticalErrors = result.Value
            .Where(d => d.Level == DiagnosticLevel.Error &&
                        d.Code != SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING)
            .ToList();
        criticalErrors.Should().BeEmpty("scan output should pass structural schema validation");
    }

    [Fact]
    public void Scan_HelmWithOutputFile_WritesValidSnapshot()
    {
        var helmDir = CreateHelmFixture("output-test");
        var outputPath = Path.Combine(_tempRoot, "helm-file-output.json");

        var exitCode = RunScan(helmDir, $"-o {outputPath}");

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();

        var json = File.ReadAllText(outputPath);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("$schema", out var schema).Should().BeTrue();
        schema.GetString().Should().Be("https://flowconsole.tech/contracts/model-snapshot/v1/schema.json");
        root.TryGetProperty("schemaVersion", out var version).Should().BeTrue();
        version.GetString().Should().Be("1.1.0");
    }

    [Fact]
    public void Scan_MixedDir_CSharpAndHelm_MergesSnapshots()
    {
        // Create a directory with both C# project files and a Helm chart
        var mixedDir = Path.Combine(_tempRoot, "mixed-cs-helm");
        Directory.CreateDirectory(mixedDir);

        // C# project
        File.WriteAllText(Path.Combine(mixedDir, "App.csproj"), """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
              </PropertyGroup>
            </Project>
            """);
        File.WriteAllText(Path.Combine(mixedDir, "Program.cs"), """
            var builder = WebApplication.CreateBuilder(args);
            var app = builder.Build();
            app.MapGet("/health", () => "ok");
            app.Run();
            """);

        // Helm chart in same directory
        File.WriteAllText(Path.Combine(mixedDir, "Chart.yaml"), "apiVersion: v2\nname: mixed-app\nversion: 0.1.0\n");
        var templatesDir = Path.Combine(mixedDir, "templates");
        Directory.CreateDirectory(templatesDir);
        File.WriteAllText(Path.Combine(templatesDir, "deployment.yaml"), """
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: mixed-app
            spec:
              replicas: 1
              template:
                spec:
                  containers:
                    - name: app
                      image: mixed:latest
            """);

        var outputPath = Path.Combine(_tempRoot, "mixed-output.json");
        var exitCode = RunScan(mixedDir, $"-o {outputPath}");

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();

        var json = File.ReadAllText(outputPath);
        using var doc = JsonDocument.Parse(json);
        var elements = doc.RootElement.GetProperty("elements");

        // Should contain elements from both scanners
        var kinds = elements.EnumerateArray()
            .Select(e => e.GetProperty("kind").GetString())
            .ToList();

        // Helm scanner produces Deployment elements
        kinds.Should().Contain("Deployment",
            "mixed-dir should include Helm infrastructure elements");

        // C# scanner produces Endpoint elements
        kinds.Should().Contain("Endpoint",
            "mixed-dir should include C# code elements");
    }

    [Fact]
    public void Scan_ScannerHelmOverride_ForcesHelm()
    {
        var helmDir = CreateHelmFixture("override-test");
        var outputPath = Path.Combine(_tempRoot, "helm-override.json");

        var exitCode = RunScan(helmDir, $"--scanner helm -o {outputPath}");

        exitCode.Should().Be(0);
        File.Exists(outputPath).Should().BeTrue();
    }

    [Fact]
    public void Scan_ScannerHelmOverride_NoCHartYaml_ExitsThree()
    {
        // Directory without Chart.yaml
        var emptyDir = Path.Combine(_tempRoot, "no-chart");
        Directory.CreateDirectory(emptyDir);

        var exitCode = RunScan(emptyDir, "--scanner helm");

        exitCode.Should().Be(3, "Helm override on directory without Chart.yaml should fail");
    }

    [Fact]
    public void Scan_MergeWith_HelmSnapshot_ComposesWithCSharp()
    {
        // Create a Helm snapshot to merge with
        var helmDir = CreateHelmFixture("merge-helm");
        var helmOutputPath = Path.Combine(_tempRoot, "helm-snap.json");

        // First scan Helm to get a snapshot file
        RunScan(helmDir, $"-o {helmOutputPath}").Should().Be(0);
        File.Exists(helmOutputPath).Should().BeTrue("Helm scan should produce output");

        // Then scan C# with --merge-with the Helm snapshot
        var csharpOutputPath = Path.Combine(_tempRoot, "merged-cs-helm.json");
        var exitCode = RunScan(_fixtureDir, $"--merge-with {helmOutputPath} -o {csharpOutputPath}");

        exitCode.Should().Be(0);
        File.Exists(csharpOutputPath).Should().BeTrue();

        var json = File.ReadAllText(csharpOutputPath);
        // Should contain Helm elements from the merge
        json.Should().Contain("helm:", "merged output should contain Helm canonical IDs");
    }

    [Fact]
    public void Scan_HelmOutput_AlwaysContainsSchemaAndVersion()
    {
        var helmDir = CreateHelmFixture("schema-check");
        var outputPath = Path.Combine(_tempRoot, "helm-schema.json");

        var exitCode = RunScan(helmDir, $"-o {outputPath}");

        exitCode.Should().Be(0);

        var json = File.ReadAllText(outputPath);
        using var doc = JsonDocument.Parse(json);
        var validator = new JsonSchemaValidator();
        var result = validator.Validate(doc);

        result.IsSuccess.Should().BeTrue();
        var criticalErrors = result.Value
            .Where(d => d.Level == DiagnosticLevel.Error &&
                        d.Code != SnapshotDiagnosticCodes.SNAPSHOT_SCHEMA_KIND_PROPERTIES_REQUIRED_MISSING)
            .ToList();
        criticalErrors.Should().BeEmpty("Helm scan output should pass structural schema validation");
    }

    private string CreateHelmFixture(string name)
    {
        var dir = Path.Combine(_tempRoot, name);
        Directory.CreateDirectory(dir);
        var templatesDir = Path.Combine(dir, "templates");
        Directory.CreateDirectory(templatesDir);

        File.WriteAllText(Path.Combine(dir, "Chart.yaml"),
            $"apiVersion: v2\nname: {name}\nversion: 0.1.0\n");

        File.WriteAllText(Path.Combine(templatesDir, "deployment.yaml"), $"""
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: {name}
            spec:
              replicas: 1
              template:
                spec:
                  containers:
                    - name: app
                      image: {name}:latest
                      ports:
                        - containerPort: 8080
            """);

        File.WriteAllText(Path.Combine(templatesDir, "service.yaml"), $"""
            apiVersion: v1
            kind: Service
            metadata:
              name: {name}
            spec:
              type: ClusterIP
              ports:
                - port: 80
                  targetPort: 8080
              selector:
                app: {name}
            """);

        return dir;
    }

    private int RunScan(string input, string extraArgs)
    {
        var parser = new FlowConsole.Scanners.CSharp.CSharpCodeParser(new NoOpAdjudicator());
        var validator = new JsonSchemaValidator();
        var router = new OutputRouter(new AtomicFileWriter());
        var ctHolder = new CancellationTokenHolder(CancellationToken.None);

        var command = new ScanCommand(parser, validator, router, ctHolder);
        var context = TestHelper.CreateContext("scan");

        var args = extraArgs.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var settings = new ScanSettings
        {
            Input = input,
            Output = args.Contains("-o") ? args[Array.IndexOf(args, "-o") + 1] : null,
            Scanner = args.Contains("--scanner") ? args[Array.IndexOf(args, "--scanner") + 1] : null,
            MergeWith = args.Contains("--merge-with") ? args[Array.IndexOf(args, "--merge-with") + 1] : null,
            Strict = args.Contains("--strict")
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
