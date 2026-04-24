using FlowConsole.Core.Entities;

namespace FlowConsole.Scanners.Core;

/// <summary>
/// Result of a scan operation, containing the snapshot and any diagnostics.
/// </summary>
public sealed record ScanResult
{
    public required ModelSnapshot Snapshot { get; init; }
    public IReadOnlyList<ScanDiagnostic> Diagnostics { get; init; } = [];
    public int FilesScanned { get; init; }
    public int FilesSkipped { get; init; }
}

public sealed record ScanDiagnostic(
    ScanDiagnosticSeverity Severity,
    string Code,
    string Message,
    string? FilePath = null,
    int? Line = null);

public enum ScanDiagnosticSeverity
{
    Info,
    Warning,
    Error
}
