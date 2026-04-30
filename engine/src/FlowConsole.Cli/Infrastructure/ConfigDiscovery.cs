namespace FlowConsole.Cli.Infrastructure;

/// <summary>
/// Discovers <c>.flowconsole.yaml</c> by walking up the directory tree from
/// the starting directory to the git root or filesystem root (first match wins).
/// Mirrors eslint/prettier/tsconfig discovery.
/// </summary>
public static class ConfigDiscovery
{
    public const string ConfigFileName = ".flowconsole.yaml";

    /// <summary>
    /// Walks up from <paramref name="startDirectory"/> looking for <c>.flowconsole.yaml</c>.
    /// Returns the full path to the config file, or <c>null</c> if not found.
    /// </summary>
    public static string? FindConfigFile(string startDirectory)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(startDirectory);

        var dir = Path.GetFullPath(startDirectory);

        while (dir is not null)
        {
            var candidate = Path.Combine(dir, ConfigFileName);
            if (File.Exists(candidate))
                return candidate;

            // Stop at git root (presence of .git directory or file)
            if (IsGitRoot(dir))
                return null;

            dir = Directory.GetParent(dir)?.FullName;
        }

        return null;
    }

    /// <summary>
    /// Parsed <c>build:</c> section from <c>.flowconsole.yaml</c>.
    /// </summary>
    public sealed record BuildConfig(string? Command, string? Output, string? Cwd);

    /// <summary>
    /// Reads a top-level YAML value from a config file (e.g., <c>api_url</c>, <c>model_id</c>).
    /// </summary>
    public static string? ReadTopLevelValue(string configFilePath, string key)
    {
        if (!File.Exists(configFilePath))
            return null;

        string[] lines;
        try { lines = File.ReadAllLines(configFilePath); }
        catch (IOException) { return null; }

        var keyPrefix = key + ":";
        foreach (var line in lines)
        {
            var trimmed = line.TrimStart();
            // Only match top-level (non-indented or zero-indent) lines
            if (line.Length > 0 && (line[0] == ' ' || line[0] == '\t'))
                continue;
            if (trimmed.StartsWith(keyPrefix, StringComparison.OrdinalIgnoreCase))
            {
                var value = trimmed[keyPrefix.Length..].Trim().Trim('"', '\'');
                var commentIdx = value.IndexOf(" #", StringComparison.Ordinal);
                if (commentIdx >= 0)
                    value = value[..commentIdx].TrimEnd();
                return string.IsNullOrEmpty(value) ? null : value;
            }
        }

        return null;
    }

    /// <summary>
    /// Reads the <c>build:</c> section from the given config file.
    /// Simple line-based parser (no YAML library dependency).
    /// </summary>
    public static BuildConfig? ReadBuildConfig(string configFilePath)
    {
        if (!File.Exists(configFilePath))
            return null;

        string[] lines;
        try
        {
            lines = File.ReadAllLines(configFilePath);
        }
        catch (IOException)
        {
            return null;
        }

        var inBuildSection = false;
        string? command = null;
        string? output = null;
        string? cwd = null;

        foreach (var line in lines)
        {
            var trimmed = line.TrimStart();

            if (trimmed.StartsWith("build:", StringComparison.OrdinalIgnoreCase) && !trimmed.Contains('#'))
            {
                inBuildSection = true;
                continue;
            }

            if (!inBuildSection)
                continue;

            // Detect end of build section (non-indented, non-empty, non-comment line)
            if (trimmed.Length > 0 && !trimmed.StartsWith('#') && line.Length > 0 && line[0] != ' ' && line[0] != '\t')
            {
                break;
            }

            command ??= ExtractYamlValue(trimmed, "command:");
            output ??= ExtractYamlValue(trimmed, "output:");
            cwd ??= ExtractYamlValue(trimmed, "cwd:");
        }

        if (!inBuildSection)
            return null;

        return new BuildConfig(command, output, cwd);
    }

    private static string? ExtractYamlValue(string trimmedLine, string key)
    {
        if (!trimmedLine.StartsWith(key, StringComparison.OrdinalIgnoreCase))
            return null;

        var raw = trimmedLine[key.Length..].TrimStart();
        if (raw.Length == 0)
            return null;

        string value;
        if (raw[0] is '"' or '\'')
        {
            var quote = raw[0];
            var end = raw.IndexOf(quote, 1);
            if (end < 0)
                return null;
            value = raw[1..end];
        }
        else
        {
            var commentIdx = raw.IndexOf(" #", StringComparison.Ordinal);
            value = (commentIdx >= 0 ? raw[..commentIdx] : raw).TrimEnd();
        }

        return string.IsNullOrEmpty(value) ? null : value;
    }

    private static bool IsGitRoot(string directory)
    {
        var gitPath = Path.Combine(directory, ".git");
        return Directory.Exists(gitPath) || File.Exists(gitPath);
    }
}
