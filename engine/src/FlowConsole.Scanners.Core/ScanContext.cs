namespace FlowConsole.Scanners.Core;

/// <summary>
/// Context passed to a scanner, containing the root path and options.
/// </summary>
public sealed record ScanContext
{
    public required string RootPath { get; init; }
    public IReadOnlyList<string> IncludePaths { get; init; } = [];
    public IReadOnlyList<string> ExcludePaths { get; init; } = [];
    public bool Strict { get; init; }
    public IReadOnlyDictionary<string, string> Parameters { get; init; } =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
}
