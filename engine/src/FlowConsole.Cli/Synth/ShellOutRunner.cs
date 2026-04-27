using System.Diagnostics;
using System.Text;

namespace FlowConsole.Cli.Synth;

/// <summary>
/// Executes a shell command as a subprocess, captures stdout, propagates cancellation.
/// On SIGINT the child process is killed and partial output discarded.
/// </summary>
internal sealed class ShellOutRunner
{
    /// <summary>Maximum stdout size (10 MB) — catastrophic if exceeded.</summary>
    private const int MaxOutputBytes = 10 * 1024 * 1024;

    /// <summary>
    /// Runs <paramref name="command"/> in a shell, captures stdout.
    /// </summary>
    /// <returns>Exit code and captured stdout.</returns>
    public async Task<(int ExitCode, string Stdout)> RunAsync(
        string command,
        string workingDirectory,
        CancellationToken ct)
    {
        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        // Use ArgumentList for proper argument separation (avoids shell quoting issues)
        if (OperatingSystem.IsWindows())
        {
            process.StartInfo.FileName = "cmd";
            process.StartInfo.ArgumentList.Add("/c");
            process.StartInfo.ArgumentList.Add(command);
        }
        else
        {
            process.StartInfo.FileName = "sh";
            process.StartInfo.ArgumentList.Add("-c");
            process.StartInfo.ArgumentList.Add(command);
        }

        var stdout = new StringBuilder();
        var outputLimitExceeded = false;

        process.Start();

        // Register cancellation to kill the process
        await using var registration = ct.Register(() =>
        {
            try { process.Kill(entireProcessTree: true); }
            catch { /* best-effort */ }
        });

        // Read stdout with size limit
        var buffer = new char[8192];
        var totalBytes = 0;

        while (true)
        {
            ct.ThrowIfCancellationRequested();

            var read = await process.StandardOutput.ReadAsync(buffer, ct).ConfigureAwait(false);
            if (read == 0) break;

            totalBytes += Encoding.UTF8.GetByteCount(buffer, 0, read);
            if (totalBytes > MaxOutputBytes)
            {
                outputLimitExceeded = true;
                try { process.Kill(entireProcessTree: true); }
                catch { /* best-effort */ }
                break;
            }

            stdout.Append(buffer, 0, read);
        }

        // Drain stderr to avoid deadlocks
        _ = await process.StandardError.ReadToEndAsync(ct).ConfigureAwait(false);

        await process.WaitForExitAsync(ct).ConfigureAwait(false);

        if (outputLimitExceeded)
            return (-1, string.Empty);

        return (process.ExitCode, stdout.ToString());
    }
}
