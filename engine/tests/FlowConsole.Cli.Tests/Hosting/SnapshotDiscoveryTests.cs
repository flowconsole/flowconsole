using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class SnapshotDiscoveryTests : IDisposable
{
    private readonly string _tempDir;
    private readonly SnapshotDiscovery _sut = new();

    public SnapshotDiscoveryTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public void Discover_ExplicitPath_FileNotFound_ThrowsFileNotFoundException()
    {
        var path = Path.Combine(_tempDir, "missing.json");
        var act = () => _sut.Discover(path, null);
        act.Should().Throw<FileNotFoundException>();
    }

    [Fact]
    public void Discover_ExplicitPath_ValidFile_ReturnsResult()
    {
        var path = WriteSnapshot(_tempDir, "test.json", "CodeScan", 3);
        var result = _sut.Discover(path, null);

        result.Path.Should().Be(path);
        result.Source.Should().Be("CodeScan");
        result.ElementCount.Should().Be(3);
    }

    [Fact]
    public void Discover_NoSnapshotsDir_ThrowsSnapshotsNotFoundException()
    {
        var oldDir = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(_tempDir);
        try
        {
            var act = () => _sut.Discover(null, null);
            act.Should().Throw<SnapshotsNotFoundException>();
        }
        finally
        {
            Directory.SetCurrentDirectory(oldDir);
        }
    }

    [Fact]
    public void Discover_EmptySnapshotsDir_ThrowsSnapshotsNotFoundException()
    {
        var snapshotsDir = Path.Combine(_tempDir, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotsDir);

        var oldDir = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(_tempDir);
        try
        {
            var act = () => _sut.Discover(null, null);
            act.Should().Throw<SnapshotsNotFoundException>();
        }
        finally
        {
            Directory.SetCurrentDirectory(oldDir);
        }
    }

    [Fact]
    public void Discover_SingleCandidate_ReturnsIt()
    {
        var snapshotsDir = Path.Combine(_tempDir, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotsDir);
        WriteSnapshot(snapshotsDir, "scan.json", "CodeScan", 5);

        var oldDir = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(_tempDir);
        try
        {
            var result = _sut.Discover(null, null);
            result.Source.Should().Be("CodeScan");
            result.ElementCount.Should().Be(5);
        }
        finally
        {
            Directory.SetCurrentDirectory(oldDir);
        }
    }

    [Fact]
    public void Discover_MultipleNonTty_ReturnsMostRecent()
    {
        var snapshotsDir = Path.Combine(_tempDir, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotsDir);

        var older = WriteSnapshot(snapshotsDir, "older.json", "CodeScan", 2);
        File.SetLastWriteTimeUtc(older, DateTime.UtcNow.AddMinutes(-10));

        var newer = WriteSnapshot(snapshotsDir, "newer.json", "Import", 7);
        File.SetLastWriteTimeUtc(newer, DateTime.UtcNow);

        var oldDir = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(_tempDir);
        try
        {
            var result = _sut.Discover(null, null);
            result.Source.Should().Be("Import");
            result.ElementCount.Should().Be(7);
        }
        finally
        {
            Directory.SetCurrentDirectory(oldDir);
        }
    }

    [Fact]
    public void Discover_SourceFilter_NoMatch_ThrowsSourceFilterEmptyException()
    {
        var snapshotsDir = Path.Combine(_tempDir, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotsDir);
        WriteSnapshot(snapshotsDir, "synth.json", "Import", 3);

        var oldDir = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(_tempDir);
        try
        {
            var act = () => _sut.Discover(null, "CodeScan");
            act.Should().Throw<SourceFilterEmptyException>()
                .Which.TotalCandidates.Should().Be(1);
        }
        finally
        {
            Directory.SetCurrentDirectory(oldDir);
        }
    }

    [Fact]
    public void Discover_CorruptJson_SkippedWithWarning()
    {
        var snapshotsDir = Path.Combine(_tempDir, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotsDir);
        File.WriteAllText(Path.Combine(snapshotsDir, "corrupt.json"), "not valid json {{{");
        WriteSnapshot(snapshotsDir, "valid.json", "CodeScan", 4);

        var oldDir = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(_tempDir);
        try
        {
            var result = _sut.Discover(null, null);
            result.Source.Should().Be("CodeScan");
            result.ElementCount.Should().Be(4);
        }
        finally
        {
            Directory.SetCurrentDirectory(oldDir);
        }
    }

    [Fact]
    public void Discover_SourceFilterAuto_IgnoresFilter()
    {
        var snapshotsDir = Path.Combine(_tempDir, ".flowconsole", "snapshots");
        Directory.CreateDirectory(snapshotsDir);
        WriteSnapshot(snapshotsDir, "scan.json", "CodeScan", 2);

        var oldDir = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(_tempDir);
        try
        {
            var result = _sut.Discover(null, "auto");
            result.Source.Should().Be("CodeScan");
        }
        finally
        {
            Directory.SetCurrentDirectory(oldDir);
        }
    }

    private static string WriteSnapshot(string dir, string fileName, string source, int elementCount)
    {
        var elements = string.Join(",\n",
            Enumerable.Range(0, elementCount).Select(i =>
                $"{{ \"id\": \"elem-{i}\", \"kind\": \"Service\", \"name\": \"Service {i}\" }}"));

        var json = $$"""
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "{{source}}",
          "elements": [{{elements}}],
          "relationships": []
        }
        """;

        var path = Path.Combine(dir, fileName);
        File.WriteAllText(path, json);
        return path;
    }
}
