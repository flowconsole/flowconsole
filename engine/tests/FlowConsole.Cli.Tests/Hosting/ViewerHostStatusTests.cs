using System.Net;
using System.Text.Json;
using FlowConsole.Cli.Hosting;
using FluentAssertions;
using Xunit;

namespace FlowConsole.Cli.Tests.Hosting;

public sealed class ViewerHostStatusTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _snapshotPath;

    public ViewerHostStatusTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fcon-viewer-status-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _snapshotPath = Path.Combine(_tempDir, "test.json");
        File.WriteAllText(_snapshotPath, """{"elements": []}""");
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public async Task GetStatus_WithoutProvider_Returns404()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port);
        var serverTask = host.RunAsync(cts.Token);

        using var client = new HttpClient();
        var response = await client.GetAsync($"http://127.0.0.1:{port}/api/status");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        cts.Cancel();
        await WaitForShutdown(serverTask);
    }

    [Fact]
    public async Task GetStatus_WithProvider_ReturnsPayloadWithNoStore()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        var version = 0L;
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port,
            statusProvider: () => (Interlocked.Increment(ref version), "building", null));
        var serverTask = host.RunAsync(cts.Token);

        using var client = new HttpClient();
        var response = await client.GetAsync($"http://127.0.0.1:{port}/api/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.CacheControl!.NoStore.Should().BeTrue();
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/json");

        var payload = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync());
        payload.GetProperty("version").GetInt64().Should().Be(1);
        payload.GetProperty("state").GetString().Should().Be("building");
        // lastError is omitted when null (JsonIgnoreCondition.WhenWritingNull)
        payload.TryGetProperty("lastError", out _).Should().BeFalse();

        cts.Cancel();
        await WaitForShutdown(serverTask);
    }

    [Fact]
    public async Task GetStatus_BuildFailed_IncludesLastError()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port,
            statusProvider: () => (7, "build-failed", "error CS1002: ; expected"));
        var serverTask = host.RunAsync(cts.Token);

        using var client = new HttpClient();
        var response = await client.GetAsync($"http://127.0.0.1:{port}/api/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync());
        payload.GetProperty("state").GetString().Should().Be("build-failed");
        payload.GetProperty("lastError").GetString().Should().Be("error CS1002: ; expected");

        cts.Cancel();
        await WaitForShutdown(serverTask);
    }

    [Fact]
    public async Task GetSnapshot_AndRoot_BehaveIdentically_WithStatusProviderAttached()
    {
        using var cts = new CancellationTokenSource();
        var port = PortAllocator.FindEphemeralPort();
        using var host = new ViewerHost(_snapshotPath, 200 * 1024 * 1024, port,
            statusProvider: () => (1, "idle", null));
        var serverTask = host.RunAsync(cts.Token);

        using var client = new HttpClient();
        var snapshot = await client.GetAsync($"http://127.0.0.1:{port}/api/snapshot");
        snapshot.StatusCode.Should().Be(HttpStatusCode.OK);
        snapshot.Headers.CacheControl!.NoStore.Should().BeTrue();

        var root = await client.GetAsync($"http://127.0.0.1:{port}/");
        root.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);

        cts.Cancel();
        await WaitForShutdown(serverTask);
    }

    private static async Task WaitForShutdown(Task serverTask)
    {
        try
        {
            await serverTask;
        }
        catch (OperationCanceledException)
        {
        }
        catch (HttpListenerException)
        {
        }
    }
}
