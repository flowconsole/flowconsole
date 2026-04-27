using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlowConsole.Cli.Telemetry;

/// <summary>
/// Persists telemetry opt-in/out state in a cross-platform config directory.
/// Linux/macOS: ~/.config/flowconsole/telemetry.json
/// Windows: %APPDATA%\flowconsole\telemetry.json
/// </summary>
internal sealed class TelemetryState
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        TypeInfoResolver = TelemetryJsonContext.Default
    };

    private readonly string _stateFilePath;

    public TelemetryState()
        : this(GetDefaultStateFilePath())
    {
    }

    internal TelemetryState(string stateFilePath)
    {
        _stateFilePath = stateFilePath;
    }

    /// <summary>
    /// Returns true if telemetry is enabled considering state file + environment overrides.
    /// Opt-out mechanisms (any one stops send):
    ///   1. fcon telemetry off (state file status=off)
    ///   2. FLOWCONSOLE_TELEMETRY=off env
    ///   3. DO_NOT_TRACK=1 env
    ///   4. --no-telemetry flag (checked by caller)
    /// </summary>
    public bool IsEnabled()
    {
        // Environment overrides take precedence
        if (string.Equals(Environment.GetEnvironmentVariable("FLOWCONSOLE_TELEMETRY"), "off", StringComparison.OrdinalIgnoreCase))
            return false;
        if (Environment.GetEnvironmentVariable("DO_NOT_TRACK") == "1")
            return false;

        var data = Load();
        return !string.Equals(data?.Status, "off", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Returns true if the first-run banner has already been shown (prompted_at is set).
    /// </summary>
    public bool HasBeenPrompted()
    {
        var data = Load();
        return data?.PromptedAt is not null;
    }

    /// <summary>
    /// Mark the first-run banner as shown.
    /// </summary>
    public void MarkPrompted()
    {
        var data = Load() ?? new StateData();
        data.PromptedAt = DateTimeOffset.UtcNow.ToString("o");
        if (data.Status is null)
            data.Status = "on"; // Default to on after first prompt
        Save(data);
    }

    /// <summary>
    /// Set telemetry status to on or off.
    /// </summary>
    public void SetStatus(string status)
    {
        var data = Load() ?? new StateData();
        data.Status = status;
        data.PromptedAt ??= DateTimeOffset.UtcNow.ToString("o");
        Save(data);
    }

    /// <summary>
    /// Get current status string (on/off or "not configured").
    /// </summary>
    public string GetStatus()
    {
        var data = Load();
        return data?.Status ?? "on (default)";
    }

    internal string StateFilePath => _stateFilePath;

    private StateData? Load()
    {
        try
        {
            if (!File.Exists(_stateFilePath))
                return null;
            var json = File.ReadAllText(_stateFilePath);
            return JsonSerializer.Deserialize<StateData>(json, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private void Save(StateData data)
    {
        var dir = Path.GetDirectoryName(_stateFilePath);
        if (dir is not null && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);
        File.WriteAllText(_stateFilePath, JsonSerializer.Serialize(data, JsonOptions));
    }

    internal static string GetDefaultStateFilePath()
    {
        // Environment.SpecialFolder.ApplicationData:
        //   Linux: ~/.config  (when XDG_CONFIG_HOME is not set)
        //   macOS: ~/.config  (Mono behavior) or ~/Library/Application Support (if .NET returns that)
        //   Windows: %APPDATA%
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        if (string.IsNullOrEmpty(appData))
        {
            // Fallback for environments where SpecialFolder doesn't resolve
            appData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".config");
        }
        return Path.Combine(appData, "flowconsole", "telemetry.json");
    }

    internal sealed class StateData
    {
        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("prompted_at")]
        public string? PromptedAt { get; set; }
    }
}

[JsonSourceGenerationOptions(
    WriteIndented = true,
    PropertyNamingPolicy = JsonKnownNamingPolicy.SnakeCaseLower,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(TelemetryState.StateData))]
internal sealed partial class TelemetryJsonContext : JsonSerializerContext
{
}
