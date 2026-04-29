using System.Diagnostics;
using System.Net;
using System.Text.RegularExpressions;

namespace FlowConsole.Cli.SmokeTests;

public sealed class TrimModePublishedSmokeTests
{
    private static readonly string? BinaryPath = Environment.GetEnvironmentVariable("FCON_PUBLISHED_PATH");

    private static string? ResolveBinary()
    {
        if (string.IsNullOrEmpty(BinaryPath))
            return null;

        if (!File.Exists(BinaryPath))
            return null;

        return BinaryPath;
    }

    private static string? ResolveFixture()
    {
        var fixturesDir = Environment.GetEnvironmentVariable("FCON_FIXTURES_DIR");
        if (!string.IsNullOrEmpty(fixturesDir))
        {
            var path = Path.Combine(fixturesDir, "minimal.json");
            return File.Exists(path) ? path : null;
        }

        var candidate = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..",
                "contracts", "model-snapshot", "v1", "conformance", "valid", "minimal.json"));
        return File.Exists(candidate) ? candidate : null;
    }

    private static (string binary, string fixture)? ResolvePrerequisites()
    {
        var binary = ResolveBinary();
        var fixture = ResolveFixture();
        if (binary is null || fixture is null)
            return null;
        return (binary, fixture);
    }

    [Fact]
    public async Task ViewerServesIndexHtml()
    {
        var prereqs = ResolvePrerequisites();
        if (prereqs is null) return;
        var (binary, fixture) = prereqs.Value;

        await using var server = await FconServer.StartAsync(binary, fixture);
        using var client = new HttpClient();

        var response = await client.GetAsync($"{server.BaseUrl}/");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("text/html");
        response.Headers.CacheControl!.NoCache.Should().BeTrue();

        var body = await response.Content.ReadAsStringAsync();
        body.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ViewerServesSnapshot()
    {
        var prereqs = ResolvePrerequisites();
        if (prereqs is null) return;
        var (binary, fixture) = prereqs.Value;

        await using var server = await FconServer.StartAsync(binary, fixture);
        using var client = new HttpClient();

        var response = await client.GetAsync($"{server.BaseUrl}/api/snapshot");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/json");
        response.Headers.CacheControl!.NoStore.Should().BeTrue();

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"elements\"");
    }

    [Fact]
    public async Task ViewerServesHashedAssets()
    {
        var prereqs = ResolvePrerequisites();
        if (prereqs is null) return;
        var (binary, fixture) = prereqs.Value;

        await using var server = await FconServer.StartAsync(binary, fixture);
        using var client = new HttpClient();

        var indexResponse = await client.GetAsync($"{server.BaseUrl}/");
        var indexBody = await indexResponse.Content.ReadAsStringAsync();

        var assetMatch = Regex.Match(indexBody, @"src=""/assets/([\w.-]+\.js)""");
        if (!assetMatch.Success)
            assetMatch = Regex.Match(indexBody, @"""(/assets/[\w.-]+\.js)""");

        assetMatch.Success.Should().BeTrue(
            "index.html should contain at least one JS asset reference; got body: " +
            indexBody[..Math.Min(indexBody.Length, 500)]);

        var assetPath = assetMatch.Groups[1].Value;
        if (!assetPath.StartsWith("/", StringComparison.Ordinal))
            assetPath = "/assets/" + assetPath;

        var assetResponse = await client.GetAsync($"{server.BaseUrl}{assetPath}");
        assetResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        assetResponse.Content.Headers.ContentType!.MediaType.Should().Be("application/javascript");
        assetResponse.Headers.CacheControl!.MaxAge.Should().Be(TimeSpan.FromSeconds(31536000));
    }

    [Fact]
    public async Task GracefulShutdownReturnsZero()
    {
        var prereqs = ResolvePrerequisites();
        if (prereqs is null) return;
        var (binary, fixture) = prereqs.Value;

        await using var server = await FconServer.StartAsync(binary, fixture);

        using var client = new HttpClient();
        var response = await client.GetAsync($"{server.BaseUrl}/api/snapshot");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var exitCode = await server.StopGracefullyAsync();

        exitCode.Should().Be(0);
    }

    private sealed class FconServer : IAsyncDisposable
    {
        private readonly Process _process;

        public string BaseUrl { get; }

        private FconServer(Process process, string baseUrl)
        {
            _process = process;
            BaseUrl = baseUrl;
        }

        public static async Task<FconServer> StartAsync(string binaryPath, string fixturePath, int timeoutSeconds = 15)
        {
            var psi = new ProcessStartInfo
            {
                FileName = binaryPath,
                ArgumentList = { "view", fixturePath, "--no-open" },
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                Environment = { ["CI"] = "true", ["NO_COLOR"] = "1" },
            };

            var process = Process.Start(psi)
                ?? throw new InvalidOperationException("Failed to start fcon process");

            var listeningRegex = new Regex(@"Listening on (http://127\.0\.0\.1:\d+)");
            var baseUrl = await ReadUntilListening(process, listeningRegex, TimeSpan.FromSeconds(timeoutSeconds));

            await WaitForServerReady(baseUrl, TimeSpan.FromSeconds(timeoutSeconds));

            return new FconServer(process, baseUrl);
        }

        private static async Task<string> ReadUntilListening(Process process, Regex pattern, TimeSpan timeout)
        {
            using var cts = new CancellationTokenSource(timeout);
            var stderrLines = new List<string>();

            while (!cts.IsCancellationRequested)
            {
                var line = await process.StandardError.ReadLineAsync(cts.Token);
                if (line is null)
                {
                    if (process.HasExited)
                        throw new InvalidOperationException(
                            $"fcon exited with code {process.ExitCode} before emitting listening URL. Stderr: {string.Join('\n', stderrLines)}");
                    continue;
                }

                stderrLines.Add(line);
                var match = pattern.Match(line);
                if (match.Success)
                    return match.Groups[1].Value;
            }

            throw new TimeoutException(
                $"Timed out waiting for listening URL. Stderr so far: {string.Join('\n', stderrLines)}");
        }

        private static async Task WaitForServerReady(string baseUrl, TimeSpan timeout)
        {
            using var cts = new CancellationTokenSource(timeout);
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };

            while (!cts.IsCancellationRequested)
            {
                try
                {
                    var response = await client.GetAsync($"{baseUrl}/api/snapshot", cts.Token);
                    if (response.IsSuccessStatusCode)
                        return;
                }
                catch (HttpRequestException) { }
                catch (TaskCanceledException) when (!cts.IsCancellationRequested) { }

                await Task.Delay(50, cts.Token);
            }

            throw new TimeoutException($"Server at {baseUrl} did not become ready within {timeout}");
        }

        public async Task<int> StopGracefullyAsync()
        {
            if (_process.HasExited)
                return _process.ExitCode;

            // SIGINT triggers CancellationHandler's graceful shutdown path
            var killResult = Process.Start("kill", ["-SIGINT", _process.Id.ToString()]);
            killResult?.WaitForExit(1000);

            try
            {
                await _process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(5));
            }
            catch (TimeoutException)
            {
                _process.Kill(entireProcessTree: true);
                await _process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(2));
            }

            return _process.ExitCode;
        }

        public async ValueTask DisposeAsync()
        {
            if (!_process.HasExited)
            {
                try
                {
                    _process.Kill(entireProcessTree: true);
                    await _process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(5));
                }
                catch { }
            }

            _process.Dispose();
        }
    }
}
