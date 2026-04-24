using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Tests.Infrastructure;

public sealed class OutputRouterTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly OutputRouter _router = new(new AtomicFileWriter());

    public OutputRouterTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"fc-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
        Directory.CreateDirectory(Path.Combine(_tempRoot, ".flowconsole"));
    }

    [Fact]
    public async Task RouteAsync_ExplicitPath_WritesToSpecifiedPath()
    {
        var outputPath = Path.Combine(_tempRoot, "explicit.json");

        var result = await _router.RouteAsync(
            """{"ok": true}""",
            explicitOutputPath: outputPath,
            category: "snapshots",
            extension: "json",
            humanSummary: null);

        result.Should().Be(outputPath);
        File.Exists(outputPath).Should().BeTrue();
        (await File.ReadAllTextAsync(outputPath)).Should().Be("""{"ok": true}""");
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); }
        catch { /* best-effort cleanup */ }
    }
}
