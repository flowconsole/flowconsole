using System.Net;
using System.Text.Json;
using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Http;
using Microsoft.Extensions.DependencyInjection;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class PushSnapshotCommandTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _snapshotPath;

    public PushSnapshotCommandTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fc-push-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        // Write a minimal valid snapshot
        _snapshotPath = Path.Combine(_tempDir, "snapshot.json");
        File.WriteAllText(_snapshotPath, MinimalSnapshot("CodeScan"));
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempDir, true); } catch { }
    }

    [Fact]
    public void SuccessfulPush_ReturnsModelVersion()
    {
        var handler = new MockHandler(HttpStatusCode.OK, """{"modelVersion": 47}""");
        var (command, ctHolder) = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            MakeSettings());

        exitCode.Should().Be(0);
        handler.Requests.Should().HaveCount(1);
        handler.Requests[0].Method.Should().Be(HttpMethod.Put);
        handler.Requests[0].RequestUri!.PathAndQuery.Should().Contain("/api/v1/models/test-model/ir");
    }

    [Fact]
    public void PerSourceSplit_SendsTwoPutRequests()
    {
        // Snapshot with elements from two sources
        var mixedSnapshot = """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "svc-1", "kind": "Service", "name": "User Service", "source": "CodeScan" },
                { "id": "ns-1", "kind": "Namespace", "name": "production", "source": "InfraScan" }
            ],
            "relationships": [
                { "sourceId": "svc-1", "targetId": "ns-1", "kind": "DeployedOn", "source": "InfraScan" }
            ]
        }
        """;
        File.WriteAllText(_snapshotPath, mixedSnapshot);

        var handler = new MockHandler(HttpStatusCode.OK, """{"modelVersion": 48}""");
        var (command, ctHolder) = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            MakeSettings());

        exitCode.Should().Be(0);
        // Two PUT requests — one per source partition
        handler.Requests.Should().HaveCount(2);
        handler.Requests.Should().AllSatisfy(r => r.Method.Should().Be(HttpMethod.Put));

        // Verify each partition only contains elements from its source
        var bodies = handler.RequestBodies;
        bodies.Should().HaveCount(2);

        // CodeScan partition should have svc-1, InfraScan should have ns-1
        var codePartition = bodies.First(b => b.Contains("\"svc-1\""));
        var infraPartition = bodies.First(b => b.Contains("\"ns-1\""));
        codePartition.Should().NotContain("\"ns-1\"");
        infraPartition.Should().NotContain("\"svc-1\"");
        // Cross-source relationship should not appear in CodeScan partition (svc-1 -> ns-1 crosses sources)
        codePartition.Should().NotContain("DeployedOn");
    }

    [Fact]
    public void Unauthorized_ReturnsExitCode4()
    {
        var handler = new MockHandler(HttpStatusCode.Unauthorized, "{}");
        var (command, _) = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            MakeSettings());

        exitCode.Should().Be(4);
    }

    [Fact]
    public void PayloadTooLarge_ReturnsExitCode4()
    {
        var handler = new MockHandler(HttpStatusCode.RequestEntityTooLarge, "{}");
        var (command, _) = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            MakeSettings());

        exitCode.Should().Be(4);
    }

    [Fact]
    public void UnprocessableEntity_TooManyElements_ReturnsExitCode4()
    {
        var handler = new MockHandler(HttpStatusCode.UnprocessableEntity, """{"error": "too many elements"}""");
        var (command, _) = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            MakeSettings());

        exitCode.Should().Be(4);
    }

    [Fact]
    public void SchemaVersionMajorMismatch_ReturnsExitCode4WithUpgradeHint()
    {
        var responseBody = """
        {
            "minSupportedSchemaVersion": "1.0.0",
            "maxSupportedSchemaVersion": "1.1.0",
            "received": "2.0.0"
        }
        """;
        var handler = new MockHandler(HttpStatusCode.UnprocessableEntity, responseBody);
        var (command, _) = CreateCommand(handler);

        int exitCode = 0;
        var stderr = CaptureStderr(() =>
            exitCode = command.Execute(TestHelper.CreateContext("push snapshot"), MakeSettings()));

        exitCode.Should().Be(4);
        stderr.Should().Contain("Schema version mismatch");
        stderr.Should().Contain("Upgrade CLI or backend");
    }

    [Fact]
    public void SuccessWithWarnings_ReturnsExitCode0_PrintsWarnings()
    {
        var responseBody = """{"modelVersion": 50, "warnings": ["minor version ahead"]}""";
        var handler = new MockHandler(HttpStatusCode.OK, responseBody);
        var (command, _) = CreateCommand(handler);

        var stderr = CaptureStderr(() =>
        {
            var code = command.Execute(TestHelper.CreateContext("push snapshot"), MakeSettings());
            code.Should().Be(0);
        });

        stderr.Should().Contain("minor version ahead");
    }

    [Fact]
    public void RetryOn503_SucceedsOnThirdAttempt()
    {
        var handler = new SequentialHandler(
            (HttpStatusCode.ServiceUnavailable, "{}"),
            (HttpStatusCode.ServiceUnavailable, "{}"),
            (HttpStatusCode.OK, """{"modelVersion": 51}"""));
        var (command, _) = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            MakeSettings());

        exitCode.Should().Be(0);
        handler.RequestCount.Should().Be(3);
    }

    [Fact]
    public void CircuitBreaker_ThreeConsecutive5xx_ReturnsExitCode4()
    {
        var handler = new MockHandler(HttpStatusCode.ServiceUnavailable, "{}");
        var (command, _) = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            MakeSettings());

        exitCode.Should().Be(4);
        // Circuit breaker trips at 3 consecutive 5xx — should not attempt 4th
        handler.Requests.Should().HaveCountLessThanOrEqualTo(3);
    }

    [Fact]
    public void DryRun_PrintsRequestWithoutNetworkCall()
    {
        var handler = new MockHandler(HttpStatusCode.OK, "{}");
        var (command, _) = CreateCommand(handler);

        var settings = MakeSettings(dryRun: true);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            settings);

        exitCode.Should().Be(0);
        handler.Requests.Should().BeEmpty(); // No network call
    }

    [Fact]
    public void ApiKeyOnCliArgs_ReturnsExitCode2()
    {
        var handler = new MockHandler(HttpStatusCode.OK, "{}");
        var (command, _) = CreateCommand(handler);

        var settings = MakeSettings(apiKey: "fcp_leaked_secret");

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            settings);

        exitCode.Should().Be(2);
        handler.Requests.Should().BeEmpty(); // Refused before any network call
    }

    [Fact]
    public void MissingApiKeyEnv_ReturnsExitCode2()
    {
        var prevKey = Environment.GetEnvironmentVariable("FLOWCONSOLE_API_KEY");
        try
        {
            var handler = new MockHandler(HttpStatusCode.OK, "{}");
            var (command, _) = CreateCommand(handler);

            // Clear env AFTER CreateCommand (which sets it) to test missing key path
            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", null);

            var settings = new PushSnapshotSettings
            {
                SnapshotPath = _snapshotPath,
                ModelId = "test-model",
                ApiUrl = "http://localhost:9999"
            };

            var exitCode = command.Execute(
                TestHelper.CreateContext("push snapshot"),
                settings);

            exitCode.Should().Be(2);
        }
        finally
        {
            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", prevKey);
        }
    }

    [Fact]
    public void MissingSnapshotFile_ReturnsExitCode2()
    {
        var handler = new MockHandler(HttpStatusCode.OK, "{}");
        var (command, _) = CreateCommand(handler);

        var settings = MakeSettings(snapshotPath: "/nonexistent/file.json");

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            settings);

        exitCode.Should().Be(2);
    }

    [Fact]
    public void MalformedJson_ReturnsExitCode2()
    {
        var badJsonPath = Path.Combine(_tempDir, "bad.json");
        File.WriteAllText(badJsonPath, "{ not valid json");

        var handler = new MockHandler(HttpStatusCode.OK, "{}");
        var (command, _) = CreateCommand(handler);

        var settings = MakeSettings(snapshotPath: badJsonPath);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push snapshot"),
            settings);

        exitCode.Should().Be(2);
    }

    [Fact]
    public void ConfigFallback_ModelIdFromYaml()
    {
        // Create a .flowconsole.yaml in the temp dir
        var configPath = Path.Combine(_tempDir, ".flowconsole.yaml");
        File.WriteAllText(configPath, "model_id: yaml-model-123\napi_url: http://yaml-server:8080\n");

        var handler = new MockHandler(HttpStatusCode.OK, """{"modelVersion": 99}""");
        var (command, _) = CreateCommand(handler);

        var settings = new PushSnapshotSettings
        {
            SnapshotPath = _snapshotPath,
            ConfigPath = configPath
            // ModelId and ApiUrl intentionally not set — should come from config
        };

        // Set API key env
        var prevKey = Environment.GetEnvironmentVariable("FLOWCONSOLE_API_KEY");
        try
        {
            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "fcp_testkey");
            var exitCode = command.Execute(
                TestHelper.CreateContext("push snapshot"),
                settings);

            exitCode.Should().Be(0);
            handler.Requests.Should().HaveCount(1);
            handler.Requests[0].RequestUri!.ToString().Should().Contain("yaml-server:8080");
            handler.Requests[0].RequestUri!.PathAndQuery.Should().Contain("yaml-model-123");
        }
        finally
        {
            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", prevKey);
        }
    }

    [Fact]
    public void SplitBySource_SingleSource_ReturnsOriginalJson()
    {
        var json = MinimalSnapshot("CodeScan");
        using var doc = JsonDocument.Parse(json);

        var partitions = PushSnapshotCommand.SplitBySource(doc);

        partitions.Should().HaveCount(1);
        partitions[0].Source.Should().Be("CodeScan");
    }

    [Fact]
    public void SplitBySource_MultipleSource_SplitsCorrectly()
    {
        var json = """
        {
            "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
            "schemaVersion": "1.1.0",
            "source": "CodeScan",
            "elements": [
                { "id": "a", "kind": "Service", "name": "A", "source": "CodeScan" },
                { "id": "b", "kind": "Service", "name": "B", "source": "CodeScan" },
                { "id": "c", "kind": "Namespace", "name": "C", "source": "InfraScan" }
            ],
            "relationships": [
                { "sourceId": "a", "targetId": "b", "kind": "Uses" },
                { "sourceId": "a", "targetId": "c", "kind": "DeployedOn" }
            ]
        }
        """;
        using var doc = JsonDocument.Parse(json);
        var partitions = PushSnapshotCommand.SplitBySource(doc);

        partitions.Should().HaveCount(2);

        // CodeScan partition: a, b + a->b relationship (both endpoints in CodeScan)
        var codeScan = partitions.First(p => p.Source == "CodeScan");
        using var codeDoc = JsonDocument.Parse(codeScan.Json);
        var codeElements = codeDoc.RootElement.GetProperty("elements").GetArrayLength();
        var codeRels = codeDoc.RootElement.GetProperty("relationships").GetArrayLength();
        codeElements.Should().Be(2);
        codeRels.Should().Be(1); // a->b only, a->c crosses sources

        // InfraScan partition: c only, no relationships
        var infraScan = partitions.First(p => p.Source == "InfraScan");
        using var infraDoc = JsonDocument.Parse(infraScan.Json);
        var infraElements = infraDoc.RootElement.GetProperty("elements").GetArrayLength();
        var infraRels = infraDoc.RootElement.GetProperty("relationships").GetArrayLength();
        infraElements.Should().Be(1);
        infraRels.Should().Be(0);
    }

    private static string MinimalSnapshot(string source) => $$"""
    {
        "$schema": "https://flowconsole.tech/contracts/model-snapshot/v1/schema.json",
        "schemaVersion": "1.1.0",
        "source": "{{source}}",
        "elements": [
            { "id": "svc-1", "kind": "Service", "name": "Test Service", "source": "{{source}}" }
        ],
        "relationships": []
    }
    """;

    private PushSnapshotSettings MakeSettings(
        string? snapshotPath = null,
        string? apiKey = null,
        bool dryRun = false) => new()
        {
            SnapshotPath = snapshotPath ?? _snapshotPath,
            ModelId = "test-model",
            ApiUrl = "http://localhost:5555",
            ApiKey = apiKey,
            DryRun = dryRun
        };

    private (PushSnapshotCommand, CancellationTokenHolder) CreateCommand(HttpMessageHandler handler)
    {
        // Set API key for tests
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "TODO");

        var services = new ServiceCollection();
        services.AddHttpClient("FlowConsole")
            .ConfigurePrimaryHttpMessageHandler(() => handler);
        services.AddSingleton<FlowConsoleApiClient>();

        var sp = services.BuildServiceProvider();
        var apiClient = sp.GetRequiredService<FlowConsoleApiClient>();
        var ctHolder = new CancellationTokenHolder(CancellationToken.None);

        return (new PushSnapshotCommand(apiClient, ctHolder), ctHolder);
    }

    private static string CaptureStderr(Action action)
    {
        var original = Console.Error;
        using var sw = new StringWriter();
        Console.SetError(sw);
        try
        {
            action();
            return sw.ToString();
        }
        finally
        {
            Console.SetError(original);
        }
    }
}

/// <summary>
/// Mock HTTP handler that returns a fixed response.
/// </summary>
internal sealed class MockHandler : HttpMessageHandler
{
    private readonly HttpStatusCode _statusCode;
    private readonly string _responseBody;

    public List<HttpRequestMessage> Requests { get; } = [];
    public List<string> RequestBodies { get; } = [];

    public MockHandler(HttpStatusCode statusCode, string responseBody)
    {
        _statusCode = statusCode;
        _responseBody = responseBody;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        // Clone request body before it's disposed
        string body = "";
        if (request.Content is not null)
            body = await request.Content.ReadAsStringAsync(ct);

        Requests.Add(request);
        RequestBodies.Add(body);

        return new HttpResponseMessage(_statusCode)
        {
            Content = new StringContent(_responseBody, System.Text.Encoding.UTF8, "application/json")
        };
    }
}

/// <summary>
/// Mock HTTP handler that returns different responses for sequential requests.
/// </summary>
internal sealed class SequentialHandler : HttpMessageHandler
{
    private readonly (HttpStatusCode Status, string Body)[] _responses;
    private int _index;

    public int RequestCount => _index;

    public SequentialHandler(params (HttpStatusCode, string)[] responses)
    {
        _responses = responses;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var (status, body) = _index < _responses.Length
            ? _responses[_index]
            : _responses[^1];
        _index++;

        return Task.FromResult(new HttpResponseMessage(status)
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json")
        });
    }
}
