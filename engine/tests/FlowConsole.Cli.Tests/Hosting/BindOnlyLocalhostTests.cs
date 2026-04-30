using System.Net;
using System.Net.Sockets;
using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class BindOnlyLocalhostTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _snapshotPath;

    public BindOnlyLocalhostTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-bind-test-{Guid.NewGuid():N}");
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
    public async Task LoopbackConnect_Succeeds()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port);
        var serverTask = host.RunAsync(cts.Token);

        using var client = new TcpClient();
        await client.ConnectAsync(IPAddress.Loopback, port);
        client.Connected.Should().BeTrue();

        cts.Cancel();
        try { await serverTask.WaitAsync(TimeSpan.FromSeconds(2)); }
        catch (OperationCanceledException) { }
        catch (TimeoutException) { }
    }

    [Fact]
    public async Task NonLoopbackConnect_Refused()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port);
        var serverTask = host.RunAsync(cts.Token);

        var nonLoopback = GetNonLoopbackAddress();
        if (nonLoopback is null)
        {
            // No non-loopback interface available on this host — skip the bind check.
            cts.Cancel();
            try { await serverTask.WaitAsync(TimeSpan.FromSeconds(2)); }
            catch (OperationCanceledException) { }
            catch (TimeoutException) { }
            return;
        }

        using var client = new TcpClient();
        var connectAction = async () => await client.ConnectAsync(nonLoopback, port);
        await connectAction.Should().ThrowAsync<SocketException>();

        cts.Cancel();
        try { await serverTask.WaitAsync(TimeSpan.FromSeconds(2)); }
        catch (OperationCanceledException) { }
        catch (TimeoutException) { }
    }

    private static IPAddress? GetNonLoopbackAddress()
    {
        try
        {
            var hostName = Dns.GetHostName();
            var addresses = Dns.GetHostAddresses(hostName);
            return addresses.FirstOrDefault(a =>
                a.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(a));
        }
        catch
        {
            return null;
        }
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
