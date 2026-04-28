using System.Net;
using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class SnapshotRefreshTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _snapshotPath;

    public SnapshotRefreshTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-refresh-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _snapshotPath = Path.Combine(_tempDir, "snapshot.json");
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public async Task SnapshotOverwritten_NextRequest_ReturnsNewContent()
    {
        File.WriteAllText(_snapshotPath, MakeSnapshot("Alpha"));

        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port);
        var serverTask = host.RunAsync(cts.Token);

        using var client = new HttpClient();
        var url = $"http://127.0.0.1:{port}/api/snapshot";

        var response1 = await client.GetStringAsync(url);
        response1.Should().Contain("Alpha");

        // Overwrite via atomic rename pattern (same as AtomicFileWriter)
        var tmpPath = _snapshotPath + ".tmp";
        File.WriteAllText(tmpPath, MakeSnapshot("Bravo"));
        File.Move(tmpPath, _snapshotPath, overwrite: true);

        var response2 = await client.GetStringAsync(url);
        response2.Should().Contain("Bravo");

        cts.Cancel();
        try { await serverTask.WaitAsync(TimeSpan.FromSeconds(2)); }
        catch (OperationCanceledException) { }
        catch (TimeoutException) { }
    }

    private static string MakeSnapshot(string serviceName) => $$"""
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [
            { "id": "svc-1", "kind": "Service", "name": "{{serviceName}}" }
          ],
          "relationships": []
        }
        """;
}
