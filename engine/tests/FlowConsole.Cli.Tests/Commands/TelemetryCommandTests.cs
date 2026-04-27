using System.Net;
using System.Text;
using System.Text.Json;
using FlowConsole.Cli.Commands;
using FlowConsole.Cli.Telemetry;
using Microsoft.Extensions.DependencyInjection;

namespace FlowConsole.Cli.Tests.Commands;

[Collection(ConsoleTestCollection.Name)]
public sealed class TelemetryCommandTests : IDisposable
{
    private readonly string _tempDir;
    private readonly string _stateFilePath;

    public TelemetryCommandTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"fc-telemetry-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _stateFilePath = Path.Combine(_tempDir, "telemetry.json");
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempDir, true); } catch { }
    }

    [Fact]
    public void TelemetryOn_UpdatesStateFile()
    {
        var state = new TelemetryState(_stateFilePath);
        var command = new TelemetryOnCommand(state);

        var exitCode = command.Execute(TestHelper.CreateContext("telemetry on"), new TelemetryOnSettings());

        exitCode.Should().Be(0);
        var json = File.ReadAllText(_stateFilePath);
        var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("status").GetString().Should().Be("on");
        doc.RootElement.TryGetProperty("prompted_at", out _).Should().BeTrue();
    }

    [Fact]
    public void TelemetryOff_UpdatesStateFile()
    {
        var state = new TelemetryState(_stateFilePath);
        var command = new TelemetryOffCommand(state);

        var exitCode = command.Execute(TestHelper.CreateContext("telemetry off"), new TelemetryOffSettings());

        exitCode.Should().Be(0);
        var json = File.ReadAllText(_stateFilePath);
        var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("status").GetString().Should().Be("off");
    }

    [Fact]
    public void TelemetryOff_SubsequentIsEnabled_ReturnsFalse()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("off");

        state.IsEnabled().Should().BeFalse();
    }

    [Fact]
    public void TelemetryStatus_PrintsStateAndEndpoint()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on");
        var command = new TelemetryStatusCommand(state);

        var stdout = CaptureStdout(() =>
        {
            var code = command.Execute(TestHelper.CreateContext("telemetry status"), new TelemetryStatusSettings());
            code.Should().Be(0);
        });

        stdout.Should().Contain("Telemetry: on");
        stdout.Should().Contain("posthog.com");
        stdout.Should().Contain(_stateFilePath);
    }

    // --- First-run banner ---

    [Fact]
    public void FirstRunBanner_PrintedOnce_SecondRunSilent()
    {
        var state = new TelemetryState(_stateFilePath);
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        // First invocation — banner should appear
        var stderr1 = CaptureStderr(() => client.ShowBannerIfNeeded());
        stderr1.Should().Contain("FlowConsole CLI (fc) sends anonymous usage stats");
        stderr1.Should().Contain("fcon telemetry off");

        // Second invocation — banner should be silent
        var stderr2 = CaptureStderr(() => client.ShowBannerIfNeeded());
        stderr2.Should().BeEmpty();
    }

    [Fact]
    public void FirstRunBanner_SetsPromptedAt()
    {
        var state = new TelemetryState(_stateFilePath);
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        client.ShowBannerIfNeeded();

        state.HasBeenPrompted().Should().BeTrue();
        var json = File.ReadAllText(_stateFilePath);
        var doc = JsonDocument.Parse(json);
        doc.RootElement.TryGetProperty("prompted_at", out _).Should().BeTrue();
    }

    // --- Opt-out mechanisms ---

    [Fact]
    public void DoNotTrack_Env_SkipsSend()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on"); // Explicitly on
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        var prev = Environment.GetEnvironmentVariable("DO_NOT_TRACK");
        try
        {
            Environment.SetEnvironmentVariable("DO_NOT_TRACK", "1");

            client.Send("scan", 0, 100, noTelemetryFlag: false, verbose: false);
            Thread.Sleep(200); // Brief wait for fire-and-forget

            handler.Requests.Should().BeEmpty();
        }
        finally
        {
            Environment.SetEnvironmentVariable("DO_NOT_TRACK", prev);
        }
    }

    [Fact]
    public void FlowconsoleTelemetryOff_Env_SkipsSend()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on");
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        var prev = Environment.GetEnvironmentVariable("FLOWCONSOLE_TELEMETRY");
        try
        {
            Environment.SetEnvironmentVariable("FLOWCONSOLE_TELEMETRY", "off");

            client.Send("scan", 0, 100, noTelemetryFlag: false, verbose: false);
            Thread.Sleep(200);

            handler.Requests.Should().BeEmpty();
        }
        finally
        {
            Environment.SetEnvironmentVariable("FLOWCONSOLE_TELEMETRY", prev);
        }
    }

    [Fact]
    public void NoTelemetryFlag_SkipsSend()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on");
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        client.Send("scan", 0, 100, noTelemetryFlag: true, verbose: false);
        Thread.Sleep(200);

        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public void StateOff_SkipsSend()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("off");
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        client.Send("scan", 0, 100, noTelemetryFlag: false, verbose: false);
        Thread.Sleep(200);

        handler.Requests.Should().BeEmpty();
    }

    [Fact]
    public void SessionId_DifferentPerProcess()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on");

        var handler1 = new TelemetryMockHandler(HttpStatusCode.OK);
        var client1 = CreateTelemetryClient(handler1, state);

        var handler2 = new TelemetryMockHandler(HttpStatusCode.OK);
        var client2 = CreateTelemetryClient(handler2, state);

        // Different TelemetryClient instances simulate different fcon invocations
        client1.SessionId.Should().NotBe(client2.SessionId);
    }

    [Fact]
    public void Payload_ContainsOnlyWhitelistFields()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on");
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        var payload = client.BuildPayload("scan", 0, 1847);
        var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;

        // Top-level keys: api_key, event, distinct_id, properties, timestamp
        var topKeys = new HashSet<string>();
        foreach (var prop in root.EnumerateObject())
            topKeys.Add(prop.Name);

        topKeys.Should().BeEquivalentTo(["api_key", "event", "distinct_id", "properties", "timestamp"]);

        // Properties keys: cli_version, platform, command, exit_code, duration_ms, session_id, $process_person_profile
        var props = root.GetProperty("properties");
        var propKeys = new HashSet<string>();
        foreach (var prop in props.EnumerateObject())
            propKeys.Add(prop.Name);

        propKeys.Should().BeEquivalentTo([
            "cli_version", "platform", "command", "exit_code",
            "duration_ms", "session_id", "$process_person_profile"
        ]);

        // Forbidden fields must not be present anywhere in JSON
        var payloadStr = payload;
        payloadStr.Should().NotContain("$ip");
        payloadStr.Should().NotContain("$geoip");
        payloadStr.Should().NotContain("$user_agent");
        payloadStr.Should().NotContain("$current_url");
        payloadStr.Should().NotContain("$device_id");

        // $process_person_profile must be false
        props.GetProperty("$process_person_profile").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public void Payload_ValuesCorrect()
    {
        var state = new TelemetryState(_stateFilePath);
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        var payload = client.BuildPayload("push snapshot", 4, 2500);
        var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;

        root.GetProperty("api_key").GetString().Should().Be(TelemetryClient.PostHogApiKey);
        root.GetProperty("event").GetString().Should().Be("fc_command");
        root.GetProperty("distinct_id").GetString().Should().Be(client.SessionId);

        var props = root.GetProperty("properties");
        props.GetProperty("command").GetString().Should().Be("push snapshot");
        props.GetProperty("exit_code").GetInt32().Should().Be(4);
        props.GetProperty("duration_ms").GetInt64().Should().Be(2500);
        props.GetProperty("session_id").GetString().Should().Be(client.SessionId);
    }

    [Fact]
    public void PostHogNetworkFailure_DoesNotAffectCliExitCode()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on");
        var handler = new TelemetryMockHandler(HttpStatusCode.InternalServerError);
        var client = CreateTelemetryClient(handler, state);

        // Send should not throw even with server errors
        client.Send("version", 0, 10, noTelemetryFlag: false, verbose: false);
        Thread.Sleep(200);

        // The handler was called but the error was swallowed
        handler.Requests.Should().NotBeEmpty();
    }

    [Fact]
    public void PostHogTimeout_DoesNotBlockCliExit()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on");
        // Handler that delays 5s (longer than 2s timeout)
        var handler = new TelemetrySlowHandler(TimeSpan.FromSeconds(5));
        var client = CreateTelemetryClient(handler, state);

        var sw = System.Diagnostics.Stopwatch.StartNew();
        client.Send("version", 0, 10, noTelemetryFlag: false, verbose: false);
        // Brief grace period — should return well before the 5s delay
        Thread.Sleep(100);
        sw.Stop();

        // Should complete almost instantly (fire-and-forget, not awaited)
        sw.ElapsedMilliseconds.Should().BeLessThan(3000);
    }

    [Fact]
    public void Send_WhenEnabled_PostsToPostHog()
    {
        var state = new TelemetryState(_stateFilePath);
        state.SetStatus("on");
        var handler = new TelemetryMockHandler(HttpStatusCode.OK);
        var client = CreateTelemetryClient(handler, state);

        client.Send("scan", 0, 500, noTelemetryFlag: false, verbose: false);
        Thread.Sleep(500); // Wait for fire-and-forget

        handler.Requests.Should().NotBeEmpty();
        handler.Requests[0].Method.Should().Be(HttpMethod.Post);
        handler.Requests[0].RequestUri!.ToString().Should().Contain("posthog.com/capture");

        // Verify payload
        var body = handler.RequestBodies[0];
        var doc = JsonDocument.Parse(body);
        doc.RootElement.GetProperty("event").GetString().Should().Be("fc_command");
        doc.RootElement.GetProperty("properties").GetProperty("command").GetString().Should().Be("scan");
    }

    [Fact]
    public void NoBackendTelemetryEndpoint_ConstantPointsToPostHog()
    {
        // Regression: telemetry must go direct to PostHog, never via FlowConsole backend
        TelemetryClient.PostHogEndpoint.Should().StartWith("https://app.posthog.com/");
        TelemetryClient.PostHogEndpoint.Should().NotContain("flowconsole");
        TelemetryClient.PostHogEndpoint.Should().NotContain("localhost");
    }

    private TelemetryClient CreateTelemetryClient(HttpMessageHandler handler, TelemetryState state)
    {
        var services = new ServiceCollection();
        services.AddHttpClient("PostHog")
            .ConfigurePrimaryHttpMessageHandler(() => handler);
        services.AddSingleton(state);
        services.AddSingleton<TelemetryClient>();

        var sp = services.BuildServiceProvider();
        return sp.GetRequiredService<TelemetryClient>();
    }

    private static string CaptureStdout(Action action)
    {
        var original = Console.Out;
        using var sw = new StringWriter();
        Console.SetOut(sw);
        try
        {
            action();
            return sw.ToString();
        }
        finally
        {
            Console.SetOut(original);
        }
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
/// Mock HTTP handler for telemetry tests.
/// </summary>
internal sealed class TelemetryMockHandler : HttpMessageHandler
{
    private readonly HttpStatusCode _statusCode;

    public List<HttpRequestMessage> Requests { get; } = [];
    public List<string> RequestBodies { get; } = [];

    public TelemetryMockHandler(HttpStatusCode statusCode)
    {
        _statusCode = statusCode;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        string body = "";
        if (request.Content is not null)
            body = await request.Content.ReadAsStringAsync(ct);

        Requests.Add(request);
        RequestBodies.Add(body);

        return new HttpResponseMessage(_statusCode)
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json")
        };
    }
}

/// <summary>
/// Mock HTTP handler that introduces a delay (for timeout testing).
/// </summary>
internal sealed class TelemetrySlowHandler : HttpMessageHandler
{
    private readonly TimeSpan _delay;

    public TelemetrySlowHandler(TimeSpan delay)
    {
        _delay = delay;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        await Task.Delay(_delay, ct);
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{}", Encoding.UTF8, "application/json")
        };
    }
}
