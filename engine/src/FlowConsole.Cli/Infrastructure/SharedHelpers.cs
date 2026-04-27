namespace FlowConsole.Cli.Infrastructure;

/// <summary>
/// Shared utility methods used across multiple CLI commands.
/// </summary>
internal static class SharedHelpers
{
    /// <summary>
    /// Extracts the rule file name from an embedded resource name.
    /// Resource names like "FlowConsole.Rules.Engine.Default.BuiltInRules.no-orphan-elements.rule.yaml"
    /// become "no-orphan-elements.rule.yaml".
    /// </summary>
    public static string ExtractRuleFileName(string resourceName)
    {
        var parts = resourceName.Split('.');
        for (var i = 0; i < parts.Length; i++)
        {
            if (parts[i] == "BuiltInRules" && i + 1 < parts.Length)
            {
                return string.Join(".", parts[(i + 1)..]);
            }
        }

        // Fallback: take last 3 segments (name.rule.yaml)
        return parts.Length >= 3
            ? string.Join(".", parts[^3..])
            : resourceName;
    }

    /// <summary>
    /// Resolves rules directory from explicit path, .flowconsole.yaml config, or default ./rules/.
    /// </summary>
    public static string ResolveRulesDir(string? explicitDir, string? configFile)
    {
        if (explicitDir is not null)
            return Path.GetFullPath(explicitDir);

        if (configFile is not null)
        {
            string[] lines;
            try
            {
                lines = File.ReadAllLines(configFile);
            }
            catch (IOException)
            {
                return Path.GetFullPath("rules");
            }

            foreach (var line in lines)
            {
                var trimmed = line.TrimStart();
                if (trimmed.StartsWith("rules_dir:", StringComparison.OrdinalIgnoreCase))
                {
                    var value = trimmed["rules_dir:".Length..].Trim().Trim('"', '\'');
                    // Strip inline YAML comments (e.g., "rules_dir: ./rules # my rules")
                    var commentIdx = value.IndexOf(" #", StringComparison.Ordinal);
                    if (commentIdx >= 0)
                        value = value[..commentIdx].TrimEnd();
                    if (!string.IsNullOrEmpty(value))
                    {
                        var configDir = Path.GetDirectoryName(configFile)!;
                        return Path.GetFullPath(Path.Combine(configDir, value));
                    }
                }
            }

            // Default: ./rules relative to config file location
            var dir = Path.GetDirectoryName(configFile)!;
            return Path.GetFullPath(Path.Combine(dir, "rules"));
        }

        return Path.GetFullPath("rules");
    }

    private static readonly string[] ValidSeverities = ["critical", "error", "warning", "info"];

    /// <summary>
    /// Returns a numeric ordering for severity levels (higher = more severe).
    /// </summary>
    public static int SeverityOrder(string severity) => severity.ToLowerInvariant() switch
    {
        "critical" => 4,
        "error" => 3,
        "warning" => 2,
        "info" => 1,
        _ => 0
    };

    /// <summary>
    /// Returns true if the given string is a recognized severity level.
    /// </summary>
    public static bool IsValidSeverity(string severity) =>
        ValidSeverities.Contains(severity.ToLowerInvariant());
}
