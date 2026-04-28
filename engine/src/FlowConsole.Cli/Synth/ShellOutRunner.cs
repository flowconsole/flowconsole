using System.Diagnostics;
using System.Text;

namespace FlowConsole.Cli.Synth;

internal sealed class ShellOutRunner
{
    private const int MaxOutputBytes = 10 * 1024 * 1024;

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

        await using var registration = ct.Register(() =>
        {
            try { process.Kill(entireProcessTree: true); }
            catch { /* best-effort */ }
        });

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
