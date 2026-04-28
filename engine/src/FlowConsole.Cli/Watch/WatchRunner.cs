using FlowConsole.Cli.Infrastructure;

namespace FlowConsole.Cli.Watch;

internal sealed class WatchRunner : IDisposable
{
    private const int DebounceMs = 200;

    private readonly string _snapshotPath;
    private readonly string _rulesDir;
    private readonly Func<Task<int>> _runValidation;
    private readonly CancellationToken _ct;

    private FileSystemWatcher? _snapshotWatcher;
    private FileSystemWatcher? _rulesDirWatcher;
    private Timer? _debounceTimer;
    private readonly SemaphoreSlim _runLock = new(1, 1);
    private int _runCount;
    private int _lastExitCode;

    public WatchRunner(
        string snapshotPath,
        string rulesDir,
        Func<Task<int>> runValidation,
        CancellationToken ct)
    {
        _snapshotPath = Path.GetFullPath(snapshotPath);
        _rulesDir = Path.GetFullPath(rulesDir);
        _runValidation = runValidation;
        _ct = ct;
    }

    public async Task<int> RunAsync()
    {
        var exitCode = await _runValidation().ConfigureAwait(false);
        Interlocked.Exchange(ref _lastExitCode, exitCode);
        Interlocked.Increment(ref _runCount);

        var snapshotDir = Path.GetDirectoryName(_snapshotPath)!;
        var snapshotFileName = Path.GetFileName(_snapshotPath);

        _snapshotWatcher = new FileSystemWatcher(snapshotDir, snapshotFileName)
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
            EnableRaisingEvents = true
        };
        _snapshotWatcher.Changed += OnFileChanged;

        if (Directory.Exists(_rulesDir))
        {
            _rulesDirWatcher = new FileSystemWatcher(_rulesDir)
            {
                IncludeSubdirectories = true,
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.Size,
                EnableRaisingEvents = true
            };
            _rulesDirWatcher.Changed += OnFileChanged;
            _rulesDirWatcher.Created += OnFileChanged;
            _rulesDirWatcher.Deleted += OnFileChanged;
        }

        CliConsole.Info($"Watching for changes... (Ctrl-C to exit)");

        try
        {
            await Task.Delay(Timeout.Infinite, _ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
        }

        return Interlocked.CompareExchange(ref _lastExitCode, 0, 0);
    }

    private void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        // Debounce: atomically swap timer to avoid race conditions from concurrent FSW events
        var newTimer = new Timer(async _ =>
        {
            if (_ct.IsCancellationRequested) return;

            // Serialize validation runs to prevent interleaved output
            try
            {
                if (!await _runLock.WaitAsync(0).ConfigureAwait(false))
                    return; // Skip if another run is already in progress
            }
            catch (ObjectDisposedException) { return; } // shutdown race — safe to ignore

            try
            {
                if (_ct.IsCancellationRequested) return;

                try { Console.Clear(); } catch { /* ignore if not supported */ }

                var result = await _runValidation().ConfigureAwait(false);
                Interlocked.Exchange(ref _lastExitCode, result);
                Interlocked.Increment(ref _runCount);
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown — ignore
            }
            catch (Exception ex)
            {
                CliConsole.Info($"Watch error: {ex.Message}");
            }
            finally
            {
                try { _runLock.Release(); }
                catch (ObjectDisposedException) { /* shutdown race — safe to ignore */ }
            }
        }, null, DebounceMs, Timeout.Infinite);
        var old = Interlocked.Exchange(ref _debounceTimer, newTimer);
        old?.Dispose();
    }

    public int RunCount => _runCount;

    public void Dispose()
    {
        _snapshotWatcher?.Dispose();
        _rulesDirWatcher?.Dispose();
        _debounceTimer?.Dispose();
        _runLock.Dispose();
    }
}
