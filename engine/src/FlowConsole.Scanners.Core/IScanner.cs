using FlowConsole.Core.Entities;

namespace FlowConsole.Scanners.Core;

/// <summary>
/// Scans infrastructure or code artifacts and produces a ModelSnapshot.
/// </summary>
public interface IScanner
{
    string ScannerType { get; }
    IReadOnlyList<string> SupportedFilePatterns { get; }
    Task<ScanResult> ScanAsync(ScanContext context, CancellationToken ct = default);
}
