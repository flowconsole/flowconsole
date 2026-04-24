using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Tests.Infrastructure;

public sealed class AtomicFileWriterTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly AtomicFileWriter _writer = new();

    public AtomicFileWriterTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
        // Create .flowconsole dir for temp files
        Directory.CreateDirectory(Path.Combine(_tempRoot, ".flowconsole"));
    }

    [Fact]
    public async Task WriteAsync_CreatesFileWithCorrectContent()
    {
        var target = Path.Combine(_tempRoot, "output.json");
        var content = """{"elements": []}""";

        await _writer.WriteAsync(target, content);

        File.Exists(target).Should().BeTrue();
        (await File.ReadAllTextAsync(target)).Should().Be(content);
    }

    [Fact]
    public async Task WriteAsync_OverwritesExistingFile()
    {
        var target = Path.Combine(_tempRoot, "output.json");
        await File.WriteAllTextAsync(target, "old");

        await _writer.WriteAsync(target, "new");

        (await File.ReadAllTextAsync(target)).Should().Be("new");
    }

    [Fact]
    public async Task WriteAsync_CreatesDirectoryIfNeeded()
    {
        var target = Path.Combine(_tempRoot, "sub", "dir", "output.json");

        await _writer.WriteAsync(target, "content");

        File.Exists(target).Should().BeTrue();
    }

    [Fact]
    public async Task WriteAsync_NoTempFilesRemainAfterSuccess()
    {
        var target = Path.Combine(_tempRoot, "output.json");
        var flowConsoleDir = Path.Combine(_tempRoot, ".flowconsole");

        await _writer.WriteAsync(target, "content");

        var tempFiles = Directory.GetFiles(flowConsoleDir, ".tmp-*");
        tempFiles.Should().BeEmpty();
    }

    [Fact]
    public async Task WriteAsync_CancellationCleansUpTempFile()
    {
        var target = Path.Combine(_tempRoot, "output.json");
        var flowConsoleDir = Path.Combine(_tempRoot, ".flowconsole");
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var act = () => _writer.WriteAsync(target, "content", cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
        File.Exists(target).Should().BeFalse();
        Directory.GetFiles(flowConsoleDir, ".tmp-*").Should().BeEmpty();
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); }
        catch { /* best-effort cleanup */ }
    }
}
