using System.Net;
using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class SnapshotSizeGrowthTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _snapshotPath;

    public SnapshotSizeGrowthTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-size-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _snapshotPath = Path.Combine(_tempDir, "snapshot.json");
        File.WriteAllText(_snapshotPath, MakeSnapshot(100));
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public async Task SnapshotGrowsBeyondMax_Returns413()
    {
        long maxBytes = 1024;

        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, maxBytes, port);
        var serverTask = host.RunAsync(cts.Token);

        using var client = new HttpClient();
        var url = $"http://127.0.0.1:{port}/api/snapshot";

        var response1 = await client.GetAsync(url);
        response1.StatusCode.Should().Be(HttpStatusCode.OK);

        // Replace with large snapshot exceeding maxBytes
        var tmpPath = _snapshotPath + ".tmp";
        File.WriteAllText(tmpPath, MakeSnapshot(2048));
        File.Move(tmpPath, _snapshotPath, overwrite: true);

        var response2 = await client.GetAsync(url);
        response2.StatusCode.Should().Be(HttpStatusCode.RequestEntityTooLarge);

        cts.Cancel();
        try { await serverTask.WaitAsync(TimeSpan.FromSeconds(2)); }
        catch (OperationCanceledException) { }
        catch (TimeoutException) { }
    }

    private static string MakeSnapshot(int paddingBytes)
    {
        var padding = new string('x', paddingBytes);
        return $$"""
            {
              "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
              "schemaVersion": "1.0.0",
              "source": "CodeScan",
              "elements": [
                { "id": "svc-1", "kind": "Service", "name": "{{padding}}" }
              ],
              "relationships": []
            }
            """;
    }
}
