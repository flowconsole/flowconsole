using System.Text.Json;
using FlowConsole.Cli.Infrastructure;
using Spectre.Console;

namespace FlowConsole.Cli.Hosting;

public sealed record DiscoveryResult(string Path, string Source, int ElementCount);

public sealed class SnapshotDiscovery
{
    public DiscoveryResult Discover(string? explicitPath, string? sourceFilter)
    {
        if (explicitPath is not null)
        {
            if (!File.Exists(explicitPath))
                throw new FileNotFoundException($"Snapshot file not found: '{explicitPath}'", explicitPath);

            return PeekSnapshot(explicitPath);
        }

        var snapshotsDir = Path.Combine(".flowconsole", "snapshots");
        if (!Directory.Exists(snapshotsDir))
            throw new SnapshotsNotFoundException(snapshotsDir);

        var candidates = Directory.GetFiles(snapshotsDir, "*.json");
        if (candidates.Length == 0)
            throw new SnapshotsNotFoundException(snapshotsDir);

        var parsed = new List<(string FilePath, DiscoveryResult Result, DateTime Mtime)>();
        foreach (var file in candidates)
        {
            try
            {
                var result = PeekSnapshot(file);
                parsed.Add((file, result, File.GetLastWriteTimeUtc(file)));
            }
            catch (JsonException)
            {
                Console.Error.WriteLine($"warning: skipping '{file}' — invalid JSON");
            }
        }

        if (parsed.Count == 0)
            throw new SnapshotsNotFoundException(snapshotsDir);

        if (sourceFilter is not null && !string.Equals(sourceFilter, "auto", StringComparison.OrdinalIgnoreCase))
        {
            var totalBeforeFilter = parsed.Count;
            parsed = parsed.Where(p =>
                string.Equals(p.Result.Source, sourceFilter, StringComparison.OrdinalIgnoreCase)).ToList();

            if (parsed.Count == 0)
                throw new SourceFilterEmptyException(sourceFilter, totalBeforeFilter);
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

    private static DiscoveryResult PeekSnapshot(string filePath)
    {
        using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete);
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
