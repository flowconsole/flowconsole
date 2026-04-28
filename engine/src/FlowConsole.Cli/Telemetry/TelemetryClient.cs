using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;

namespace FlowConsole.Cli.Telemetry;

internal sealed class TelemetryClient
{
    // Public capture key — not a secret. Same pattern as Vercel, Bun, Astro OSS CLIs.
    // PostHog public keys are poisonable by design; data is advisory only.
    internal const string PostHogApiKey = "phc_flowconsole_cli_public_capture_key";
    internal const string PostHogEndpoint = "https://app.posthog.com/capture/";
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(2);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly TelemetryState _state;
    private readonly string _sessionId = Guid.NewGuid().ToString();
    private readonly string _cliVersion;
    private readonly string _platform;

    public TelemetryClient(IHttpClientFactory httpClientFactory, TelemetryState state)
    {
        _httpClientFactory = httpClientFactory;
        _state = state;
        _cliVersion = Commands.VersionCommand.GetVersion();
        _platform = GetPlatformIdentifier();
    }

    internal string SessionId => _sessionId;

    internal Func<bool> IsTtyCheck { get; set; } = DefaultIsTty;

    public void ShowBannerIfNeeded(string commandName = "", string[]? args = null)
    {
        if (_state.HasBeenPrompted())
            return;

        if (IsCi())
            return;

        if (!IsTtyCheck())
            return;

        if (commandName == "completion")
            return;

        if (args is not null && args.Any(IsInfoFlag))
            return;

        FlowConsole.Cli.Infrastructure.CliConsole.DetailBlock(FirstRunBanner.ShortNotice);
        _state.MarkPrompted();
    }

    private static bool IsCi()
    {
        var ci = Environment.GetEnvironmentVariable("CI");
        return !string.IsNullOrEmpty(ci)
            && !ci.Equals("0", StringComparison.Ordinal)
            && !ci.Equals("false", StringComparison.OrdinalIgnoreCase);
    }

    private static bool DefaultIsTty()
    {
        try
        {
            return !Console.IsErrorRedirected;
        }
        catch
        {
            return false;
        }
    }

    private static bool IsInfoFlag(string arg) =>
        arg is "--help" or "-h" or "-?" or "--version" or "-v";

    public Task Send(string command, int exitCode, long durationMs, bool noTelemetryFlag, bool verbose)
    {
        if (noTelemetryFlag)
            return Task.CompletedTask;

        if (!_state.IsEnabled())
            return Task.CompletedTask;

        var payload = BuildPayload(command, exitCode, durationMs);

        return Task.Run(async () =>
        {
            try
            {
                using var cts = new CancellationTokenSource(Timeout);
                await SendWithRetryAsync(payload, verbose, cts.Token);
            }
            catch
            {
                // Silently swallow all errors — telemetry must never affect CLI
            }
        });
    }

    private async Task SendWithRetryAsync(string payload, bool verbose, CancellationToken ct)
    {
        const int maxAttempts = 2;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("PostHog");
                using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                using var response = await client.PostAsync(PostHogEndpoint, content, ct);

                if (verbose)
                    Console.Error.WriteLine($"[telemetry] POST {PostHogEndpoint} → {(int)response.StatusCode}");

                if (response.IsSuccessStatusCode)
                    return;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                if (verbose)
                    Console.Error.WriteLine($"[telemetry] attempt {attempt + 1} failed: {ex.Message}");
            }
        }
    }

    internal string BuildPayload(string command, int exitCode, long durationMs)
    {
        var timestamp = DateTimeOffset.UtcNow.ToString("o");

        using var ms = new MemoryStream();
        using var writer = new Utf8JsonWriter(ms);

        writer.WriteStartObject();
        writer.WriteString("api_key", PostHogApiKey);
        writer.WriteString("event", "fc_command");
        writer.WriteString("distinct_id", _sessionId);

        writer.WritePropertyName("properties");
        writer.WriteStartObject();
        writer.WriteString("cli_version", _cliVersion);
        writer.WriteString("platform", _platform);
        writer.WriteString("command", command);
        writer.WriteNumber("exit_code", exitCode);
        writer.WriteNumber("duration_ms", durationMs);
        writer.WriteString("session_id", _sessionId);
        writer.WriteBoolean("$process_person_profile", false);
        writer.WriteEndObject();

        writer.WriteString("timestamp", timestamp);
        writer.WriteEndObject();
        writer.Flush();

        return Encoding.UTF8.GetString(ms.ToArray());
    }

    private static string GetPlatformIdentifier()
    {
        var os = OperatingSystem.IsWindows() ? "win"
            : OperatingSystem.IsMacOS() ? "osx"
            : "linux";
        var arch = RuntimeInformation.ProcessArchitecture switch
        {
            Architecture.Arm64 => "arm64",
            Architecture.X64 => "x64",
            Architecture.X86 => "x86",
            _ => RuntimeInformation.ProcessArchitecture.ToString().ToLowerInvariant()
        };
        return $"{os}-{arch}";
    }
}
