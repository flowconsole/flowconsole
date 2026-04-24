namespace FlowConsole.Cli.Infrastructure;

/// <summary>
/// Writes file outputs atomically via a temp file (<c>.tmp-*</c>) in the target directory
/// and renames on success. Prevents corrupt files on SIGINT.
/// </summary>
public sealed class AtomicFileWriter
{
    private const string TempPrefix = ".tmp-";

    /// <summary>
    /// Writes <paramref name="content"/> to <paramref name="targetPath"/> atomically.
    /// The temp file is created in the same directory as the target to ensure
    /// <see cref="File.Move"/> works across filesystem boundaries.
    /// </summary>
    public async Task WriteAsync(string targetPath, string content, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetPath);
        ArgumentNullException.ThrowIfNull(content);

        var fullTarget = Path.GetFullPath(targetPath);
        var targetDir = Path.GetDirectoryName(fullTarget)!;
        Directory.CreateDirectory(targetDir);

        var tempPath = Path.Combine(targetDir, $"{TempPrefix}{Guid.NewGuid():N}");

        try
        {
            await File.WriteAllTextAsync(tempPath, content, ct).ConfigureAwait(false);
            File.Move(tempPath, fullTarget, overwrite: true);
        }
        catch
        {
            // Best-effort cleanup of temp file on failure
            TryDeleteFile(tempPath);
            throw;
        }
    }

    private static void TryDeleteFile(string path)
    {
        try { File.Delete(path); }
        catch { /* best-effort */ }
    }
}
