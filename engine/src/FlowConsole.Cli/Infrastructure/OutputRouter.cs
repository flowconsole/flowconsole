namespace FlowConsole.Cli.Infrastructure;

/// <summary>
/// Routes CLI output based on context:
/// (1) stdout is a pipe → write content to stdout (for piping JSON/SARIF)
/// (2) stdout is a TTY → write to <c>.flowconsole/{category}/latest.{ext}</c> + human summary to stdout
/// (3) explicit <c>-o path</c> → write to that path
/// </summary>
public sealed class OutputRouter
{
    private readonly AtomicFileWriter _writer;

    public OutputRouter(AtomicFileWriter writer)
    {
        _writer = writer;
    }

    /// <summary>
    /// Determines where output should go and writes it.
    /// Returns the path where the output was written, or <c>null</c> if written to stdout.
    /// </summary>
    public async Task<string?> RouteAsync(
        string content,
        string? explicitOutputPath,
        string category,
        string extension,
        string? humanSummary,
        CancellationToken ct = default)
    {
        // (3) Explicit -o path takes priority
        if (!string.IsNullOrWhiteSpace(explicitOutputPath))
        {
            await _writer.WriteAsync(explicitOutputPath, content, ct).ConfigureAwait(false);
            return explicitOutputPath;
        }

        // (1) Piped stdout → write to stdout
        if (Console.IsOutputRedirected)
        {
            Console.Write(content);
            return null;
        }

        // (2) TTY → write to .flowconsole/{category}/latest.{ext}
        var outputPath = Path.Combine(".flowconsole", category, $"latest.{extension}");
        await _writer.WriteAsync(outputPath, content, ct).ConfigureAwait(false);

        // Print human summary to stdout
        if (!string.IsNullOrWhiteSpace(humanSummary))
            Console.WriteLine(humanSummary);

        return outputPath;
    }
}
