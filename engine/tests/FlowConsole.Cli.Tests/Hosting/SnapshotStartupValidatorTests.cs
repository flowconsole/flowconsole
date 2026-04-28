using FlowConsole.Cli.Hosting;
using FlowConsole.Schema.SnapshotValidation;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class SnapshotStartupValidatorTests : IDisposable
{
    private readonly string _tempDir;
    private readonly SnapshotStartupValidator _sut;
    private static readonly string ConformanceValidDir = FindConformanceValidDir();

    public SnapshotStartupValidatorTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _sut = new SnapshotStartupValidator(new JsonSchemaValidator());
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public void ValidateAndLoad_MinimalFixture_ReturnsParsedSnapshot()
    {
        var path = Path.Combine(ConformanceValidDir, "minimal.json");

        var snapshot = _sut.ValidateAndLoad(path, 200 * 1024 * 1024);

        snapshot.Elements.Should().HaveCountGreaterThan(0);
        snapshot.Relationships.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public void ValidateAndLoad_MissingFile_ThrowsFileNotFoundException()
    {
        var path = Path.Combine(_tempDir, "missing.json");
        var act = () => _sut.ValidateAndLoad(path, 200 * 1024 * 1024);
        act.Should().Throw<FileNotFoundException>();
    }

    [Fact]
    public void ValidateAndLoad_FileExceedsMaxBytes_Throws()
    {
        var path = Path.Combine(_tempDir, "big.json");
        File.WriteAllText(path, new string(' ', 2000));

        var act = () => _sut.ValidateAndLoad(path, 1000);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*exceeding limit*");
    }

    [Fact]
    public void ValidateAndLoad_MalformedJson_ThrowsWithLineInfo()
    {
        var path = Path.Combine(_tempDir, "malformed.json");
        File.WriteAllText(path, "{ \"bad\": }");

        var act = () => _sut.ValidateAndLoad(path, 200 * 1024 * 1024);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*invalid JSON*");
    }

    [Fact]
    public void ValidateAndLoad_MissingSchemaField_ThrowsValidationError()
    {
        var path = Path.Combine(_tempDir, "no-schema.json");
        File.WriteAllText(path, """
        {
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [],
          "relationships": []
        }
        """);

        var act = () => _sut.ValidateAndLoad(path, 200 * 1024 * 1024);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*validation errors*");
    }

    [Fact]
    public void ValidateAndLoad_MultiKindFixture_ParsesAllElements()
    {
        var path = Path.Combine(ConformanceValidDir, "multi-kind.json");

        var snapshot = _sut.ValidateAndLoad(path, 200 * 1024 * 1024);

        snapshot.Elements.Should().HaveCountGreaterThan(1);
    }

    private static string FindConformanceValidDir()
    {
        var dir = AppContext.BaseDirectory;
        while (dir is not null)
        {
            var candidate = Path.Combine(dir, "contracts", "model-snapshot", "v1", "conformance", "valid");
            if (Directory.Exists(candidate)) return candidate;

            dir = Path.GetDirectoryName(dir);
        }
        throw new InvalidOperationException("Cannot find conformance/valid directory");
    }
}
