using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlowConsole.Cli.Telemetry;

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

    public bool IsEnabled()
    {
        if (string.Equals(Environment.GetEnvironmentVariable("FLOWCONSOLE_TELEMETRY"), "off", StringComparison.OrdinalIgnoreCase))
            return false;
        if (Environment.GetEnvironmentVariable("DO_NOT_TRACK") == "1")
            return false;

        var data = Load();
        return !string.Equals(data?.Status, "off", StringComparison.OrdinalIgnoreCase);
    }

    public bool HasBeenPrompted()
    {
        var data = Load();
        return data?.PromptedAt is not null;
    }

    public void MarkPrompted()
    {
        var data = Load() ?? new StateData();
        data.PromptedAt = DateTimeOffset.UtcNow.ToString("o");
        if (data.Status is null)
            data.Status = "on";
        Save(data);
    }

    public void SetStatus(string status)
    {
        var data = Load() ?? new StateData();
        data.Status = status;
        data.PromptedAt ??= DateTimeOffset.UtcNow.ToString("o");
        Save(data);
    }

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
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        if (string.IsNullOrEmpty(appData))
        {
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
