using System.Runtime.InteropServices;

namespace FlowConsole.Cli.Infrastructure;

/// <summary>
/// Handles SIGINT (Ctrl-C) and SIGTERM for CLI commands.
/// First signal cancels the token and prints a message to stderr.
/// Second signal triggers a hard exit (no cleanup).
/// </summary>
public static class CancellationHandler
{
    private static int _signalCount;

    /// <summary>
    /// Sets up SIGINT and SIGTERM handling. Returns a <see cref="CancellationToken"/>
    /// that is cancelled on the first signal. A second signal triggers hard exit.
    /// </summary>
    public static CancellationToken Setup()
    {
        var cts = new CancellationTokenSource();
        _signalCount = 0;

        Console.CancelKeyPress += (_, e) =>
        {
            var count = Interlocked.Increment(ref _signalCount);

            if (count == 1)
            {
                // First Ctrl-C: cancel gracefully
                e.Cancel = true;
                cts.Cancel();
                Console.Error.WriteLine("Aborted. Partial output in .flowconsole/ may be incomplete.");
            }
            else
            {
                // Second Ctrl-C: hard exit
                e.Cancel = false;
                Environment.Exit(130);
            }
        };

        RegisterSigterm(cts);

        return cts.Token;
    }

    /// <summary>
    /// `kill &lt;pid&gt;` (SIGTERM) must follow the same graceful path as Ctrl-C:
    /// long-running sessions (`fcon watch`) rely on it to dispose the listener,
    /// watchers, and build child processes instead of dying mid-write.
    /// </summary>
    private static void RegisterSigterm(CancellationTokenSource cts)
    {
        if (!OperatingSystem.IsLinux() && !OperatingSystem.IsMacOS())
            return;

        PosixSignalRegistration.Create(PosixSignal.SIGTERM, context =>
        {
            context.Cancel = true;

            var count = Interlocked.Increment(ref _signalCount);
            if (count > 1)
                Environment.Exit(130);

            cts.Cancel();
            Console.Error.WriteLine("Aborted. Partial output in .flowconsole/ may be incomplete.");
        });
    }
}
