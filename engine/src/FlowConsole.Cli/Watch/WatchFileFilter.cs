namespace FlowConsole.Cli.Watch;

/// <summary>
/// Decides whether a filesystem event on the watched tree should trigger a
/// rebuild: C# sources and project files are inputs to the configured build
/// command; build outputs (<c>bin/</c>, <c>obj/</c>) and the snapshot
/// directory are excluded to prevent rebuild feedback loops.
/// </summary>
internal static class WatchFileFilter
{
    private static readonly string[] ExcludedDirNames = ["bin", "obj", ".flowconsole", "node_modules"];
    private static readonly HashSet<string> IncludedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".cs",
        ".csproj",
    };

    /// <summary>
    /// The watched config file name, matched at the watched root only by the caller.
    /// </summary>
    public const string ConfigFileName = ".flowconsole.yaml";

    public static bool ShouldTrigger(string fullPath, string watchedRoot)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fullPath);
        ArgumentException.ThrowIfNullOrWhiteSpace(watchedRoot);

        var root = Path.GetFullPath(watchedRoot);
        var path = Path.GetFullPath(fullPath);

        // Compare with a trailing separator so /foo/bar-baz is not treated as
        // a child of /foo/bar.
        var rootPrefix = root.EndsWith(Path.DirectorySeparatorChar)
            ? root
            : root + Path.DirectorySeparatorChar;
        if (!path.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
            return false;

        var relative = Path.GetRelativePath(root, path);
        var segments = relative.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

        foreach (var segment in segments[..^1])
        {
            if (ExcludedDirNames.Contains(segment, StringComparer.OrdinalIgnoreCase))
                return false;
        }

        if (string.Equals(Path.GetFileName(path), ConfigFileName, StringComparison.OrdinalIgnoreCase))
            return segments.Length == 1;

        var ext = Path.GetExtension(path);
        return IncludedExtensions.Contains(ext);
    }
}
