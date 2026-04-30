using System.Text.Json;
using FlowConsole.Cli.Infrastructure;
using Spectre.Console;

namespace FlowConsole.Cli.Hosting;

public sealed record DiscoveryResult(string Path, string Source, int ElementCount);

public sealed class SnapshotDiscovery
{
    public DiscoveryResult Discover(string? explicitPath, string? sourceFilter, long maxBytes = long.MaxValue)
    {
        if (explicitPath is not null)
        {
            if (!File.Exists(explicitPath))
                throw new FileNotFoundException($"Snapshot file not found: '{explicitPath}'", explicitPath);

            return PeekSnapshot(explicitPath, maxBytes);
        }

        var snapshotsDir = Path.GetFullPath(Path.Combine(".flowconsole", "snapshots"));
        if (!Directory.Exists(snapshotsDir))
            throw new SnapshotsNotFoundException(snapshotsDir);

        var candidates = Directory.GetFiles(snapshotsDir, "*.json");
        if (candidates.Length == 0)
            throw new SnapshotsNotFoundException(snapshotsDir);

        var parsed = new List<(string FilePath, DiscoveryResult Result, DateTime Mtime)>();
        var oversized = new List<string>();
        foreach (var file in candidates)
        {
            try
            {
                var result = PeekSnapshot(file, maxBytes);
                parsed.Add((file, result, File.GetLastWriteTimeUtc(file)));
            }
            catch (JsonException)
            {
                Console.Error.WriteLine($"warning: skipping '{file}' — invalid JSON");
            }
            catch (SnapshotTooLargeException ex)
            {
                Console.Error.WriteLine($"warning: skipping '{file}' — {ex.Message}");
                oversized.Add(file);
            }
        }

        if (parsed.Count == 0)
        {
            if (oversized.Count > 0)
                throw new InvalidOperationException(
                    $"All snapshot files exceed the size limit ({maxBytes:N0} bytes). " +
                    $"Use --max-snapshot-bytes to increase the limit or specify a smaller snapshot with an explicit path.");
            throw new SnapshotsNotFoundException(snapshotsDir);
        }

        if (sourceFilter is not null && !string.Equals(sourceFilter, "auto", StringComparison.OrdinalIgnoreCase))
        {
            var totalBeforeFilter = parsed.Count;
            parsed = parsed.Where(p => MatchesSourceFilter(p.Result.Source, sourceFilter)).ToList();

            if (parsed.Count == 0)
            {
                if (oversized.Count > 0)
                    throw new InvalidOperationException(
                        $"No snapshots match source filter '{sourceFilter}' ({totalBeforeFilter} candidate(s) checked, " +
                        $"{oversized.Count} skipped due to size). " +
                        $"Use --max-snapshot-bytes to increase the limit or specify an explicit path.");
                throw new SourceFilterEmptyException(sourceFilter, totalBeforeFilter);
            }
        }

        if (parsed.Count == 1)
            return parsed[0].Result;

        if (EnvironmentDetector.IsTty)
        {
            var prompt = new SelectionPrompt<(string FilePath, DiscoveryResult Result, DateTime Mtime)>()
                .Title("Multiple snapshots found. Select one:")
                .UseConverter(item => $"{Path.GetFileName(item.FilePath)} ({item.Result.Source}, {item.Result.ElementCount} elements)")
                .AddChoices(parsed.OrderByDescending(p => p.Mtime));

            var selected = AnsiConsole.Prompt(prompt);
            return selected.Result;
        }

        var mostRecent = parsed.OrderByDescending(p => p.Mtime).First();
        Console.Error.WriteLine(
            $"warning: {parsed.Count} snapshots found, using most recent: {Path.GetFileName(mostRecent.FilePath)}");
        return mostRecent.Result;
    }

    // CLI exposes friendly aliases (scan, build) that map to wire-format source values:
    //   scan  → CodeScan, InfraScan (anything ending in "Scan")
    //   build → Git (SDK-built snapshots always emit source: "Git")
    private static bool MatchesSourceFilter(string snapshotSource, string filter) =>
        string.Equals(snapshotSource, filter, StringComparison.OrdinalIgnoreCase)
        || (string.Equals(filter, "scan", StringComparison.OrdinalIgnoreCase)
            && snapshotSource.EndsWith("Scan", StringComparison.OrdinalIgnoreCase))
        || (string.Equals(filter, "build", StringComparison.OrdinalIgnoreCase)
            && string.Equals(snapshotSource, "Git", StringComparison.OrdinalIgnoreCase));

    private static DiscoveryResult PeekSnapshot(string filePath, long maxBytes)
    {
        using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete);

        if (stream.Length > maxBytes)
            throw new SnapshotTooLargeException(filePath, stream.Length, maxBytes);

        using var doc = JsonDocument.Parse(stream);
        var root = doc.RootElement;

        var source = root.TryGetProperty("source", out var srcProp) && srcProp.ValueKind == JsonValueKind.String
            ? srcProp.GetString() ?? "unknown"
            : "unknown";

        var elementCount = root.TryGetProperty("elements", out var elemArr) && elemArr.ValueKind == JsonValueKind.Array
            ? elemArr.GetArrayLength()
            : 0;

        return new DiscoveryResult(filePath, source, elementCount);
    }
}
