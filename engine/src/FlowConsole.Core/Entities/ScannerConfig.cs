namespace FlowConsole.Core.Entities;

public sealed record ScannerConfig
{
    public string ScannerType { get; init; } = string.Empty;
    public IReadOnlyDictionary<string, string> Parameters { get; init; } =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    public string Get(string key, string defaultValue = "") =>
        Parameters.TryGetValue(key, out var v) ? v : defaultValue;
}
