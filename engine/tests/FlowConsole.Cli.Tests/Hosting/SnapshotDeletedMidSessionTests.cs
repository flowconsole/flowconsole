using System.Net;
using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class SnapshotDeletedMidSessionTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _snapshotPath;

    public SnapshotDeletedMidSessionTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-delete-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _snapshotPath = Path.Combine(_tempDir, "snapshot.json");
        File.WriteAllText(_snapshotPath, MakeSnapshot());
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public async Task SnapshotDeleted_Returns404()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port);
        var serverTask = host.RunAsync(cts.Token);

        using var client = new HttpClient();
        var url = $"http://127.0.0.1:{port}/api/snapshot";

        var response1 = await client.GetAsync(url);
        response1.StatusCode.Should().Be(HttpStatusCode.OK);

        File.Delete(_snapshotPath);

        var response2 = await client.GetAsync(url);
        response2.StatusCode.Should().Be(HttpStatusCode.NotFound);

        cts.Cancel();
        try { await serverTask.WaitAsync(TimeSpan.FromSeconds(2)); }
        catch (OperationCanceledException) { }
        catch (TimeoutException) { }
    }

    private static string MakeSnapshot() => """
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [
            { "id": "svc-1", "kind": "Service", "name": "Test" }
          ],
          "relationships": []
        }
        """;
}
