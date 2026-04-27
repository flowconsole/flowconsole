namespace FlowConsole.Cli.Infrastructure;

/// <summary>
/// Handles SIGINT (Ctrl-C) for CLI commands.
/// First signal cancels the token and prints a message to stderr.
/// Second signal triggers a hard exit (no cleanup).
/// </summary>
public static class CancellationHandler
{
    private static int _signalCount;

    /// <summary>
    /// Sets up SIGINT handling. Returns a <see cref="CancellationToken"/> that
    /// is cancelled on the first Ctrl-C. Second Ctrl-C triggers hard exit.
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

        return cts.Token;
    }
}
