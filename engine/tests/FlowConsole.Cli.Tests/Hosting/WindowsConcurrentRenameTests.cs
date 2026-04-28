using System.Net;
using System.Runtime.InteropServices;
using FlowConsole.Cli.Hosting;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class WindowsConcurrentRenameTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _snapshotPath;

    public WindowsConcurrentRenameTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-rename-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _snapshotPath = Path.Combine(_tempDir, "snapshot.json");
        File.WriteAllText(_snapshotPath, MakeSnapshot("Initial"));
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    [Fact(Skip = "Windows-only: concurrent rename with FileShare.Delete")]
    public async Task ConcurrentRead_DuringAtomicRename_NoSharingViolation()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return;

        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port);
        var serverTask = host.RunAsync(cts.Token);

        using var client = new HttpClient();
        var url = $"http://127.0.0.1:{port}/api/snapshot";

        var exceptions = new List<Exception>();
        var readTask = Task.Run(async () =>
        {
            for (var i = 0; i < 50; i++)
            {
                try
                {
                    await client.GetStringAsync(url);
                }
                catch (Exception ex)
                {
                    exceptions.Add(ex);
                }
                await Task.Delay(10);
            }
        });

        var writeTask = Task.Run(async () =>
        {
            for (var i = 0; i < 50; i++)
            {
                var tmpPath = _snapshotPath + $".tmp-{i}";
                File.WriteAllText(tmpPath, MakeSnapshot($"Version-{i}"));
                File.Move(tmpPath, _snapshotPath, overwrite: true);
                await Task.Delay(10);
            }
        });

        await Task.WhenAll(readTask, writeTask);

        exceptions.Should().BeEmpty("concurrent reads during atomic rename should not throw");

        cts.Cancel();
        try { await serverTask.WaitAsync(TimeSpan.FromSeconds(2)); }
        catch (OperationCanceledException) { }
        catch (TimeoutException) { }
    }

    private static string MakeSnapshot(string name) => $$"""
        {
          "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
          "schemaVersion": "1.0.0",
          "source": "CodeScan",
          "elements": [
            { "id": "svc-1", "kind": "Service", "name": "{{name}}" }
          ],
          "relationships": []
        }
        """;
}
