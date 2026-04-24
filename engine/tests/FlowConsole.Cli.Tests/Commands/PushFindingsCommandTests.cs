using System.Net;
using System.Text.Json;
using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Http;
using Microsoft.Extensions.DependencyInjection;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class PushFindingsCommandTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _findingsPath;

    public PushFindingsCommandTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fc-findings-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        _findingsPath = Path.Combine(_tempDir, "findings.json");
        File.WriteAllText(_findingsPath, MinimalFindings());
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempDir, true); } catch { }
    }

    [Fact]
    public void SuccessfulPush_ReturnsValidationRunId()
    {
        var responseBody = """{"id": "run-abc-123"}""";
        var handler = new MockHandler(HttpStatusCode.Created, responseBody);
        var command = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            MakeSettings());

        exitCode.Should().Be(0);
        handler.Requests.Should().HaveCount(1);
        handler.Requests[0].Method.Should().Be(HttpMethod.Post);
        handler.Requests[0].RequestUri!.PathAndQuery
            .Should().Contain("/api/v1/models/test-model/validation-runs");
    }

    [Fact]
    public void SuccessfulPush_RequestBodyContainsFindingsArray()
    {
        var handler = new MockHandler(HttpStatusCode.Created, """{"id": "run-1"}""");
        var command = CreateCommand(handler);

        command.Execute(TestHelper.CreateContext("push findings"), MakeSettings());

        handler.RequestBodies.Should().HaveCount(1);
        using var doc = JsonDocument.Parse(handler.RequestBodies[0]);
        doc.RootElement.TryGetProperty("findings", out var findings).Should().BeTrue();
        findings.ValueKind.Should().Be(JsonValueKind.Array);
        findings.GetArrayLength().Should().Be(1);
    }

    [Fact]
    public void SuccessfulPush_CliMetadataOverridesFileValues()
    {
        var handler = new MockHandler(HttpStatusCode.Created, """{"id": "run-1"}""");
        var command = CreateCommand(handler);

        var settings = MakeSettings();
        settings = new PushFindingsSettings
        {
            FindingsPath = _findingsPath,
            ModelId = "test-model",
            ApiUrl = "http://localhost:9999",
            Source = "pull_request",
            CommitSha = "abc123",
            Branch = "feature/test",
            PipelineUrl = "https://ci.example.com/1"
        };

        command.Execute(TestHelper.CreateContext("push findings"), settings);

        using var doc = JsonDocument.Parse(handler.RequestBodies[0]);
        var root = doc.RootElement;
        root.GetProperty("source").GetString().Should().Be("pull_request");
        root.GetProperty("commitSha").GetString().Should().Be("abc123");
        root.GetProperty("branch").GetString().Should().Be("feature/test");
        root.GetProperty("pipelineUrl").GetString().Should().Be("https://ci.example.com/1");
    }

    [Fact]
    public void FindingsAsArray_AcceptedAndWrapped()
    {
        // File contains just the array, not the full request object
        var arrayFindings = """
        [
            { "ruleId": "R1", "ruleName": "Rule 1", "severity": "warning", "blocking": false, "message": "test" }
        ]
        """;
        var arrayPath = Path.Combine(_tempDir, "array-findings.json");
        File.WriteAllText(arrayPath, arrayFindings);

        var handler = new MockHandler(HttpStatusCode.Created, """{"id": "run-2"}""");
        var command = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            MakeSettings(findingsPath: arrayPath));

        exitCode.Should().Be(0);

        using var doc = JsonDocument.Parse(handler.RequestBodies[0]);
        doc.RootElement.TryGetProperty("findings", out var findings).Should().BeTrue();
        findings.GetArrayLength().Should().Be(1);
    }

    [Fact]
    public void Unauthorized_ReturnsExitCode4()
    {
        var handler = new MockHandler(HttpStatusCode.Unauthorized, "{}");
        var command = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            MakeSettings());

        exitCode.Should().Be(4);
    }

    [Fact]
    public void PayloadTooLarge_ReturnsExitCode4()
    {
        var handler = new MockHandler(HttpStatusCode.RequestEntityTooLarge, "{}");
        var command = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            MakeSettings());

        exitCode.Should().Be(4);
    }

    [Fact]
    public void RetryOn503_SucceedsOnThirdAttempt()
    {
        var handler = new SequentialHandler(
            (HttpStatusCode.ServiceUnavailable, "{}"),
            (HttpStatusCode.ServiceUnavailable, "{}"),
            (HttpStatusCode.Created, """{"id": "run-retry"}"""));
        var command = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            MakeSettings());

        exitCode.Should().Be(0);
        handler.RequestCount.Should().Be(3);
    }

    [Fact]
    public void CircuitBreaker_ThreeConsecutive5xx_ReturnsExitCode4()
    {
        var handler = new MockHandler(HttpStatusCode.ServiceUnavailable, "{}");
        var command = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            MakeSettings());

        exitCode.Should().Be(4);
        handler.Requests.Should().HaveCountLessThanOrEqualTo(3);
    }

    [Fact]
    public void DryRun_PrintsRequestWithoutNetworkCall()
    {
        var handler = new MockHandler(HttpStatusCode.Created, "{}");
        var command = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            MakeSettings(dryRun: true));

        exitCode.Should().Be(0);
        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public void ApiKeyOnCliArgs_ReturnsExitCode2()
    {
        var handler = new MockHandler(HttpStatusCode.Created, "{}");
        var command = CreateCommand(handler);

        var settings = MakeSettings(apiKey: "fcp_leaked_secret");

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            settings);

        exitCode.Should().Be(2);
        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public void InvalidSource_ReturnsExitCode2()
    {
        var handler = new MockHandler(HttpStatusCode.Created, "{}");
        var command = CreateCommand(handler);

        var settings = new PushFindingsSettings
        {
            FindingsPath = _findingsPath,
            ModelId = "test-model",
            ApiUrl = "http://localhost:9999",
            Source = "invalid_source"
        };

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            settings);

        exitCode.Should().Be(2);
        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public void MissingFindingsFile_ReturnsExitCode2()
    {
        var handler = new MockHandler(HttpStatusCode.Created, "{}");
        var command = CreateCommand(handler);

        var settings = MakeSettings(findingsPath: "/nonexistent/findings.json");

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            settings);

        exitCode.Should().Be(2);
    }

    [Fact]
    public void MalformedJson_ReturnsExitCode2()
    {
        var badPath = Path.Combine(_tempDir, "bad.json");
        File.WriteAllText(badPath, "{ not valid json");

        var handler = new MockHandler(HttpStatusCode.Created, "{}");
        var command = CreateCommand(handler);

        var exitCode = command.Execute(
            TestHelper.CreateContext("push findings"),
            MakeSettings(findingsPath: badPath));

        exitCode.Should().Be(2);
    }

    [Fact]
    public void MissingApiKeyEnv_ReturnsExitCode2()
    {
        var prevKey = Environment.GetEnvironmentVariable("FLOWCONSOLE_API_KEY");
        try
        {
            var handler = new MockHandler(HttpStatusCode.Created, "{}");
            var command = CreateCommand(handler);

            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", null);

            var settings = new PushFindingsSettings
            {
                FindingsPath = _findingsPath,
                ModelId = "test-model",
                ApiUrl = "http://localhost:9999"
            };

            var exitCode = command.Execute(
                TestHelper.CreateContext("push findings"),
                settings);

            exitCode.Should().Be(2);
        }
        finally
        {
            Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", prevKey);
        }
    }

    [Fact]
    public void BuildRequestBody_FullObject_PreservesFieldsAndMergesMetadata()
    {
        var input = """
        {
            "findings": [
                { "ruleId": "R1", "ruleName": "Rule 1", "severity": "error", "blocking": true, "message": "fail" }
            ],
            "totalRules": 10,
            "driftScore": 0.85,
            "source": "manual",
            "executedAt": "2026-04-22T10:00:00Z"
        }
        """;

        var settings = new PushFindingsSettings
        {
            FindingsPath = "/dummy",
            Source = "push" // CLI flag overrides file value
        };

        var json = PushFindingsCommand.BuildRequestBody(input, settings);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("findings").GetArrayLength().Should().Be(1);
        root.GetProperty("totalRules").GetInt32().Should().Be(10);
        root.GetProperty("driftScore").GetDecimal().Should().Be(0.85m);
        root.GetProperty("source").GetString().Should().Be("push"); // CLI override
        root.GetProperty("executedAt").GetString().Should().Contain("2026");
    }

    [Fact]
    public void BuildRequestBody_ArrayInput_WrapsInObject()
    {
        var input = """
        [
            { "ruleId": "R1", "ruleName": "Rule 1", "severity": "info", "blocking": false, "message": "ok" }
        ]
        """;

        var settings = new PushFindingsSettings { FindingsPath = "/dummy" };

        var json = PushFindingsCommand.BuildRequestBody(input, settings);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.ValueKind.Should().Be(JsonValueKind.Object);
        root.GetProperty("findings").GetArrayLength().Should().Be(1);
    }

    private static string MinimalFindings() => """
    {
        "findings": [
            {
                "ruleId": "no-orphan-services",
                "ruleName": "No Orphan Services",
                "severity": "warning",
                "blocking": false,
                "message": "Service 'payment-svc' has no relationships",
                "elementIds": ["payment-svc"]
            }
        ]
    }
    """;

    private PushFindingsSettings MakeSettings(
        string? findingsPath = null,
        string? apiKey = null,
        bool dryRun = false) => new()
    {
        FindingsPath = findingsPath ?? _findingsPath,
        ModelId = "test-model",
        ApiUrl = "http://localhost:9999",
        ApiKey = apiKey,
        DryRun = dryRun
    };

    private PushFindingsCommand CreateCommand(HttpMessageHandler handler)
    {
        Environment.SetEnvironmentVariable("FLOWCONSOLE_API_KEY", "fcp_testtoken123");

        var services = new ServiceCollection();
        services.AddHttpClient("FlowConsole")
            .ConfigurePrimaryHttpMessageHandler(() => handler);
        services.AddSingleton<FlowConsoleApiClient>();

        var sp = services.BuildServiceProvider();
        var apiClient = sp.GetRequiredService<FlowConsoleApiClient>();
        var ctHolder = new CancellationTokenHolder(CancellationToken.None);

        return new PushFindingsCommand(apiClient, ctHolder);
    }
}
