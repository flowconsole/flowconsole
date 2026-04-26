using System.Security;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Serialization;
using FlowConsole.Core.Entities;
using FlowConsole.Core.ValueObjects;
using FlowConsole.Scanners.Core;
using FlowConsole.Snapshots.Mapping;

namespace FlowConsole.Cli.Scanners;

/// <summary>
/// Dispatches scan requests to the appropriate scanner based on auto-detection or explicit override.
/// Handles merging of multiple scan results and graceful degradation.
///
/// Detection order for directories:
///   1. Check Chart.yaml presence (Helm)
///   2. Check .sln/.slnx/.csproj/.cs presence (C#)
///   Both checks run independently — if both match, scanners run in sequence and results merge.
/// For files: extension-based detection (unchanged from Phase 1).
/// </summary>
internal sealed class ScannerDispatcher
{
    private readonly CSharpScannerAdapter _csharpScanner;
    private readonly HelmScannerAdapter _helmScanner;

    public ScannerDispatcher(CSharpScannerAdapter csharpScanner, HelmScannerAdapter helmScanner)
    {
        _csharpScanner = csharpScanner;
        _helmScanner = helmScanner;
    }

    /// <summary>
    /// Detects the input type from a path and dispatches to the correct scanner.
    /// </summary>
    public async Task<DispatchResult> DispatchAsync(
        string inputPath,
        string? scannerOverride,
        string? mergeWithPath,
        bool strict,
        CancellationToken ct)
    {
        var fullPath = Path.GetFullPath(inputPath);
        var diagnostics = new List<ScanDiagnostic>();

        // Check if path exists
        if (!File.Exists(fullPath) && !Directory.Exists(fullPath))
        {
            return DispatchResult.Failure(
                $"Path not found: {fullPath}",
                exitCode: 3);
        }

        // Determine which scanners to run
        var scanners = scannerOverride is not null
            ? DetectByOverride(scannerOverride)
            : DetectScanners(fullPath);

        if (scanners == DetectedScanners.None)
        {
            var message = scannerOverride is not null
                ? $"Unknown scanner: '{scannerOverride}'. Supported scanners: csharp, helm."
                : $"No scanner available for: {fullPath}. Supported inputs: .sln, .slnx, .csproj, .cs files/directories, Helm charts (Chart.yaml).";
            return DispatchResult.Failure(message, exitCode: 3);
        }

        if (scanners == DetectedScanners.ModelSnapshot)
        {
            CliConsole.Info("Input appears to be a ModelSnapshot JSON file. Use `fc fmt` instead — it is the first-class command for formatting and normalizing snapshots.");
            return DispatchResult.IdentityMode();
        }

        var snapshots = new List<ModelSnapshot>();
        int totalFilesScanned = 0;
        int totalFilesSkipped = 0;

        // Run Helm scanner if detected
        if (scanners.HasFlag(DetectedScanners.Helm))
        {
            var helmPath = File.Exists(fullPath) ? Path.GetDirectoryName(fullPath)! : fullPath;
            var helmResult = await _helmScanner.ScanAsync(helmPath, strict, ct).ConfigureAwait(false);
            diagnostics.AddRange(helmResult.Diagnostics);
            totalFilesScanned += helmResult.FilesScanned;
            totalFilesSkipped += helmResult.FilesSkipped;

            if (strict && diagnostics.Any(d => d.Severity == ScanDiagnosticSeverity.Error))
                return DispatchResult.StrictFailure(diagnostics);

            if (helmResult.Snapshot.Elements.Count > 0)
                snapshots.Add(helmResult.Snapshot);
        }

        // Run C# scanner if detected
        if (scanners.HasFlag(DetectedScanners.CSharp))
        {
            var scanPath = File.Exists(fullPath) ? Path.GetDirectoryName(fullPath)! : fullPath;
            var csharpResult = await _csharpScanner.ScanAsync(scanPath, strict, ct).ConfigureAwait(false);
            diagnostics.AddRange(csharpResult.Diagnostics);
            totalFilesScanned += csharpResult.FilesScanned;
            totalFilesSkipped += csharpResult.FilesSkipped;

            if (strict && diagnostics.Any(d => d.Severity == ScanDiagnosticSeverity.Error))
                return DispatchResult.StrictFailure(diagnostics);

            if (csharpResult.Snapshot.Elements.Count > 0)
                snapshots.Add(csharpResult.Snapshot);
        }

        // Merge scanner results
        ModelSnapshot snapshot;
        if (snapshots.Count == 0)
            snapshot = new ModelSnapshot(ElementSource.CodeScan, [], []);
        else if (snapshots.Count == 1)
            snapshot = snapshots[0];
        else
        {
            // When merging snapshots from different source partitions (e.g. CodeScan + InfraScan
            // in a mixed C#/Helm directory), the top-level Source must be one value. Per-element
            // Source fields are preserved in the serialized JSON, but the backend DtoMapper treats
            // the top-level Source as authoritative and rewrites all items to it. Warn users that
            // mixed-source output must be split by source before pushing via `fc push`.
            var distinctSources = snapshots.Select(s => s.Source).Distinct().ToList();
            var mergeSource = distinctSources.Count == 1
                ? distinctSources[0]
                : snapshots[0].Source;

            if (distinctSources.Count > 1)
            {
                diagnostics.Add(new ScanDiagnostic(
                    ScanDiagnosticSeverity.Warning,
                    "SCAN_MIXED_SOURCES",
                    $"Merged snapshots from different source partitions ({string.Join(", ", distinctSources)}). " +
                    $"Top-level source set to '{mergeSource}'; per-element sources are preserved. " +
                    $"Split by source before pushing to the backend."));
            }

            snapshot = SnapshotMerger.Merge(snapshots, mergeSource);
        }

        // Merge with existing snapshot if requested
        if (mergeWithPath is not null)
        {
            var mergeResult = await MergeWithExisting(snapshot, mergeWithPath, diagnostics, ct).ConfigureAwait(false);
            if (!mergeResult.Success)
            {
                diagnostics.Add(new ScanDiagnostic(
                    ScanDiagnosticSeverity.Error,
                    "SCAN_MERGE_ERROR",
                    mergeResult.ErrorMessage!));
                if (strict)
                    return DispatchResult.StrictFailure(diagnostics);
            }
            else
            {
                snapshot = mergeResult.Snapshot!;
            }
        }

        // Check catastrophic: no elements at all
        if (snapshot.Elements.Count == 0)
        {
            // If there are error diagnostics, report them; otherwise generic "no files" message
            if (diagnostics.Any(d => d.Severity == ScanDiagnosticSeverity.Error))
                return DispatchResult.StrictFailure(diagnostics);

            return DispatchResult.Failure("No parseable files found", exitCode: 3);
        }

        return DispatchResult.Ok(snapshot, diagnostics, totalFilesScanned, totalFilesSkipped);
    }

    private static DetectedScanners DetectScanners(string path)
    {
        if (File.Exists(path))
        {
            var ext = Path.GetExtension(path).ToLowerInvariant();
            return ext switch
            {
                ".sln" or ".slnx" or ".csproj" or ".cs" => DetectedScanners.CSharp,
                ".json" => ClassifyJson(path),
                ".yaml" or ".yml" when Path.GetFileName(path).Equals("Chart.yaml", StringComparison.OrdinalIgnoreCase)
                    => DetectedScanners.Helm,
                _ => DetectedScanners.None
            };
        }

        if (Directory.Exists(path))
        {
            var result = DetectedScanners.None;

            if (File.Exists(Path.Combine(path, "Chart.yaml")))
                result |= DetectedScanners.Helm;

            if (HasCSharpFiles(path))
                result |= DetectedScanners.CSharp;

            return result;
        }

        return DetectedScanners.None;
    }

    private static DetectedScanners DetectByOverride(string scanner)
    {
        return scanner.ToLowerInvariant() switch
        {
            "csharp" or "c#" or "cs" => DetectedScanners.CSharp,
            "helm" => DetectedScanners.Helm,
            _ => DetectedScanners.None
        };
    }

    private static DetectedScanners ClassifyJson(string path)
    {
        try
        {
            // Read only the first 4KB to avoid OOM on large JSON files.
            // Snapshot marker fields ($schema, schemaVersion, elements) appear early.
            var buffer = new char[4096];
            using var reader = new StreamReader(path);
            var charsRead = reader.Read(buffer, 0, buffer.Length);
            var text = new string(buffer, 0, charsRead);

            if (text.Contains("\"$schema\"", StringComparison.Ordinal) &&
                text.Contains("\"schemaVersion\"", StringComparison.Ordinal) &&
                text.Contains("\"elements\"", StringComparison.Ordinal))
            {
                return DetectedScanners.ModelSnapshot;
            }
        }
        catch (Exception)
        {
            // If we can't read it, it's not a snapshot
        }

        return DetectedScanners.None;
    }

    private static bool HasCSharpFiles(string dir)
    {
        try
        {
            return Directory.EnumerateFiles(dir, "*.sln", SearchOption.TopDirectoryOnly).Any() ||
                   Directory.EnumerateFiles(dir, "*.slnx", SearchOption.TopDirectoryOnly).Any() ||
                   Directory.EnumerateFiles(dir, "*.csproj", SearchOption.AllDirectories).Any() ||
                   Directory.EnumerateFiles(dir, "*.cs", SearchOption.AllDirectories).Any();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or SecurityException)
        {
            return false;
        }
    }

    private static async Task<MergeResult> MergeWithExisting(
        ModelSnapshot scanned, string existingPath, List<ScanDiagnostic> diagnostics, CancellationToken ct)
    {
        try
        {
            var json = await File.ReadAllTextAsync(existingPath, ct).ConfigureAwait(false);
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var existing = SnapshotDeserializer.Deserialize(doc);

            // Check actual per-item sources, not just the top-level Source field.
            // A previously merged snapshot may have top-level Source=CodeScan but still
            // contain InfraScan items from an earlier Helm merge. Checking only the
            // top-level field would miss this case (see Codex review finding).
            var mergeSource = scanned.Source;
            var allItemSources = CollectItemSources(existing).Union(CollectItemSources(scanned)).ToList();

            if (allItemSources.Count > 1)
            {
                diagnostics.Add(new ScanDiagnostic(
                    ScanDiagnosticSeverity.Warning,
                    "SCAN_MIXED_SOURCES",
                    $"Merging snapshots from different source partitions ({string.Join(", ", allItemSources)}). " +
                    $"Top-level source set to '{mergeSource}'; per-element sources are preserved. " +
                    $"Split by source before pushing to the backend."));
            }

            var merged = SnapshotMerger.Merge([existing, scanned], mergeSource);
            return new MergeResult(true, merged, null);
        }
        catch (Exception ex)
        {
            return new MergeResult(false, null, $"Failed to merge with {existingPath}: {ex.Message}");
        }
    }

    /// <summary>
    /// Collects all distinct ElementSource values from a snapshot's elements and relationships.
    /// Falls back to the snapshot's top-level Source if no items exist.
    /// </summary>
    private static HashSet<ElementSource> CollectItemSources(ModelSnapshot snapshot)
    {
        var sources = new HashSet<ElementSource>();
        foreach (var e in snapshot.Elements)
            sources.Add(e.Source);
        foreach (var r in snapshot.Relationships)
            sources.Add(r.Source);
        if (sources.Count == 0)
            sources.Add(snapshot.Source);
        return sources;
    }

    [Flags]
    private enum DetectedScanners
    {
        None = 0,
        CSharp = 1,
        Helm = 2,
        ModelSnapshot = 4
    }

    private sealed record MergeResult(bool Success, ModelSnapshot? Snapshot, string? ErrorMessage);
}

/// <summary>
/// Result of scanner dispatch.
/// </summary>
internal sealed record DispatchResult
{
    public bool Success { get; init; }
    public ModelSnapshot? Snapshot { get; init; }
    public IReadOnlyList<ScanDiagnostic> Diagnostics { get; init; } = [];
    public int FilesScanned { get; init; }
    public int FilesSkipped { get; init; }
    public int ExitCode { get; init; }
    public bool IsIdentityMode { get; init; }

    public static DispatchResult Ok(ModelSnapshot snapshot, List<ScanDiagnostic> diagnostics, int scanned, int skipped)
        => new()
        {
            Success = true,
            Snapshot = snapshot,
            Diagnostics = diagnostics,
            FilesScanned = scanned,
            FilesSkipped = skipped,
            ExitCode = 0
        };

    public static DispatchResult Failure(string message, int exitCode)
        => new()
        {
            Success = false,
            Diagnostics = [new ScanDiagnostic(ScanDiagnosticSeverity.Error, "SCAN_FATAL", message)],
            ExitCode = exitCode
        };

    public static DispatchResult StrictFailure(List<ScanDiagnostic> diagnostics)
        => new()
        {
            Success = false,
            Diagnostics = diagnostics,
            ExitCode = 3
        };

    public static DispatchResult IdentityMode()
        => new()
        {
            Success = false,
            IsIdentityMode = true,
            ExitCode = 0
        };
}
