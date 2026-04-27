using System.Text.Json;
using FlowConsole.Core.Evidence;

namespace FlowConsole.Scanners.CSharp;

public static class CSharpConfigHintCollector
{
    private const string SourceAdapter = "csharp-config";

    public static IReadOnlyList<EvidenceRecord> Collect(string projectDir)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(projectDir);

        if (!Directory.Exists(projectDir))
            return [];

        var evidence = new List<EvidenceRecord>();
        var projectName = Path.GetFileName(projectDir);

        // Find appsettings.json and appsettings.*.json
        var configFiles = Directory.EnumerateFiles(projectDir, "appsettings*.json", SearchOption.TopDirectoryOnly)
            .Where(f =>
            {
                var name = Path.GetFileName(f);
                return name.Equals("appsettings.json", StringComparison.OrdinalIgnoreCase) ||
                       (name.StartsWith("appsettings.", StringComparison.OrdinalIgnoreCase) &&
                        name.EndsWith(".json", StringComparison.OrdinalIgnoreCase));
            });

        foreach (var configFile in configFiles)
        {
            CollectFromConfigFile(configFile, projectDir, projectName, evidence);
        }

        return evidence;
    }

    private static void CollectFromConfigFile(
        string configFile, string projectDir, string subject,
        List<EvidenceRecord> evidence)
    {
        try
        {
            var content = File.ReadAllText(configFile);
            var relativePath = Path.GetRelativePath(projectDir, configFile).Replace('\\', '/');

            using var doc = JsonDocument.Parse(content, new JsonDocumentOptions
            {
                CommentHandling = JsonCommentHandling.Skip,
                AllowTrailingCommas = true
            });

            ExtractHints(doc.RootElement, "", relativePath, subject, evidence);
        }
        catch (JsonException)
        {
            // Skip malformed JSON files
        }
    }

    private static void ExtractHints(
        JsonElement element, string path, string filePath, string subject,
        List<EvidenceRecord> evidence)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    var childPath = string.IsNullOrEmpty(path) ? property.Name : $"{path}:{property.Name}";
                    ExtractHints(property.Value, childPath, filePath, subject, evidence);
                }
                break;

            case JsonValueKind.String:
                var value = element.GetString();
                if (value != null && IsEndpointHint(value))
                {
                    evidence.Add(new EvidenceRecord(
                        Subject: subject,
                        EvidenceKind: EvidenceKind.ConfigEndpointHint,
                        EvidenceValue: $"{path}={value}",
                        Location: filePath,
                        OriginFile: filePath,
                        SourceAdapter: SourceAdapter,
                        WeightHint: 15));
                }
                else if (value != null && IsConnectionStringHint(path, value))
                {
                    evidence.Add(new EvidenceRecord(
                        Subject: subject,
                        EvidenceKind: EvidenceKind.ConfigEndpointHint,
                        EvidenceValue: $"{path}=<connection-string>",
                        Location: filePath,
                        OriginFile: filePath,
                        SourceAdapter: SourceAdapter,
                        WeightHint: 20));
                }
                break;
        }
    }

    private static bool IsEndpointHint(string value)
    {
        return value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("grpc://", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("https+http://", StringComparison.OrdinalIgnoreCase) ||
               value.StartsWith("http+https://", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsConnectionStringHint(string path, string value)
    {
        // Check path for ConnectionStrings section
        if (path.StartsWith("ConnectionStrings:", StringComparison.OrdinalIgnoreCase))
            return true;

        // Check value for common connection string patterns
        return value.Contains("Server=", StringComparison.OrdinalIgnoreCase) ||
               value.Contains("Data Source=", StringComparison.OrdinalIgnoreCase) ||
               value.Contains("Host=", StringComparison.OrdinalIgnoreCase);
    }
}
