namespace FlowConsole.Cli.Watch;

/// <summary>
/// Outcome of one rebuild attempt executed by <see cref="WatchSession"/>.
/// </summary>
internal sealed record RebuildResult(bool Succeeded, string? Error)
{
    public static RebuildResult Ok() => new(true, null);

    public static RebuildResult Fail(string error) => new(false, error);
}

/// <summary>
/// Rebuild loop state exposed to the viewer status endpoint. Immutable snapshot
/// per read; <see cref="Version"/> strictly increases on every success.
/// </summary>
internal sealed record WatchStatus(long Version, string State, string? LastError)
{
    public const string StateIdle = "idle";
    public const string StateBuilding = "building";
    public const string StateBuildFailed = "build-failed";
}

/// <summary>
/// Serializes rebuild runs triggered by watch mode: never more than one build
/// at a time, and an event arriving during a running build triggers exactly
/// one follow-up build (latest-state-wins, unlike a queue).
/// </summary>
internal sealed class WatchSession : IDisposable
{
    private readonly Func<CancellationToken, Task<RebuildResult>> _rebuild;
    private readonly SemaphoreSlim _runLock = new(1, 1);
    private readonly object _gate = new();

    private long _version;
    private string _state = WatchStatus.StateIdle;
    private string? _lastError;
    private bool _pending;
    private bool _disposed;

    public WatchSession(Func<CancellationToken, Task<RebuildResult>> rebuild)
    {
        _rebuild = rebuild;
    }

    public WatchStatus Status
    {
        get
        {
            lock (_gate)
            {
                return new WatchStatus(_version, _state, _lastError);
            }
        }
    }

    /// <summary>
    /// Requests a rebuild. If one is already running, marks a pending follow-up
    /// and returns immediately; the follow-up runs after the current build.
    /// Never throws after disposal.
    /// </summary>
    public void RequestRebuild()
    {
        bool startLoop;
        lock (_gate)
        {
            if (_disposed)
                return;
            startLoop = _runLock.Wait(0);
            if (!startLoop)
                _pending = true;
        }

        if (startLoop)
            _ = RunBuildLoopAsync();
    }

    /// <summary>
    /// Runs the initial build synchronously and returns its result. A pending
    /// follow-up set by <see cref="RequestRebuild"/> during the initial build
    /// is executed after this returns.
    /// </summary>
    public async Task<RebuildResult> RunInitialAsync(CancellationToken ct)
    {
        await _runLock.WaitAsync(ct).ConfigureAwait(false);

        try
        {
            return await ExecuteBuildKeepState(ct).ConfigureAwait(false);
        }
        finally
        {
            TryHandOffToFollowUp();
        }
    }

    /// <summary>
    /// Releases the run lock and, under the same gate where <see cref="RequestRebuild"/>
    /// sets the pending flag, spawns a follow-up loop when one is pending. Holding
    /// the gate across the release closes the window where a request landing between
    /// the pending check and the lock release would be dropped.
    /// </summary>
    private void TryHandOffToFollowUp()
    {
        bool startLoop;
        lock (_gate)
        {
            if (_disposed)
                _pending = false;
            startLoop = !_disposed && _pending;
            _pending = false;

            if (!startLoop)
                ReleaseRunLock();
        }

        if (!startLoop)
            return;

        // Hand the lock over to the follow-up loop: release first, then
        // reacquire. A RequestRebuild racing in between is safe — it either
        // takes the lock itself or sets the pending flag the loop consumes.
        ReleaseRunLock();
        if (_runLock.Wait(0))
            _ = RunBuildLoopAsync();
    }

    private async Task RunBuildLoopAsync()
    {
        try
        {
            while (true)
            {
                await ExecuteBuildKeepState(CancellationToken.None).ConfigureAwait(false);

                lock (_gate)
                {
                    if (_disposed)
                    {
                        _pending = false;
                        return;
                    }
                    if (!_pending)
                        return;
                    _pending = false;
                }
            }
        }
        finally
        {
            ReleaseRunLock();
        }
    }

    private void ReleaseRunLock()
    {
        try { _runLock.Release(); }
        catch (ObjectDisposedException) { /* shutdown race */ }
        catch (SemaphoreFullException) { /* double-release guard during shutdown */ }
    }

    private async Task<RebuildResult> ExecuteBuildKeepState(CancellationToken ct)
    {
        lock (_gate)
        {
            _state = WatchStatus.StateBuilding;
        }

        RebuildResult result;
        try
        {
            result = await _rebuild(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            result = RebuildResult.Fail(ex.Message);
        }

        lock (_gate)
        {
            if (result.Succeeded)
            {
                _version++;
                _state = WatchStatus.StateIdle;
                _lastError = null;
            }
            else
            {
                _state = WatchStatus.StateBuildFailed;
                _lastError = result.Error;
            }
        }

        return result;
    }

    public void Dispose()
    {
        lock (_gate)
        {
            _disposed = true;
            _pending = false;
        }
        _runLock.Dispose();
    }
}
