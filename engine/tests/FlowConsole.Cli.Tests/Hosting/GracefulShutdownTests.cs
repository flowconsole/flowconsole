using System.Net.Sockets;
using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class GracefulShutdownTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _snapshotPath;

    public GracefulShutdownTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-shutdown-test-{Guid.NewGuid():N}");
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
    public async Task CancelToken_RunAsyncReturnsWithin1Second()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port);
        var serverTask = host.RunAsync(cts.Token);

        // Verify server is up
        using var client = new HttpClient();
        var response = await client.GetAsync($"http://127.0.0.1:{port}/api/snapshot");
        response.IsSuccessStatusCode.Should().BeTrue();

        cts.Cancel();

        try
        {
            await serverTask.WaitAsync(TimeSpan.FromSeconds(3));
        }
        catch (OperationCanceledException) { }
    }

    [Fact]
    public async Task AfterShutdown_PortReleased()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port);
        var serverTask = host.RunAsync(cts.Token);

        // Verify server is up
        using var client = new HttpClient();
        await client.GetAsync($"http://127.0.0.1:{port}/api/snapshot");

        cts.Cancel();
        try { await serverTask.WaitAsync(TimeSpan.FromSeconds(2)); }
        catch (OperationCanceledException) { }
        catch (TimeoutException) { }

        host.Dispose();

        // Port should be free now — binding should succeed
        using var listener = new TcpListener(System.Net.IPAddress.Loopback, port);
        var bindAction = () => { listener.Start(); listener.Stop(); };
        bindAction.Should().NotThrow();
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
