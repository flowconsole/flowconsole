using System.Net;
using FlowConsole.Cli.Hosting;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Serialization;
using FlowConsole.Cli.Synth;
using FlowConsole.Cli.Watch;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

/// <summary>
/// `fcon watch`: single-command local loop — rebuilds the snapshot when the
/// architecture source changes and live-serves the viewer on loopback.
/// </summary>
internal sealed class WatchCommand : AsyncCommand<WatchSettings>
{
    private const int AutoPortBindRetries = 3;

    private readonly AtomicFileWriter _atomicWriter;
    private readonly OutputRouter _outputRouter;
    private readonly CancellationTokenHolder _ctHolder;
    private readonly ShellOutRunner _shellRunner;
    private readonly BrowserLauncher _browserLauncher;

    public WatchCommand(
        AtomicFileWriter atomicWriter,
        OutputRouter outputRouter,
        CancellationTokenHolder ctHolder,
        ShellOutRunner shellRunner,
        BrowserLauncher browserLauncher)
    {
        _atomicWriter = atomicWriter;
        _outputRouter = outputRouter;
        _ctHolder = ctHolder;
        _shellRunner = shellRunner;
        _browserLauncher = browserLauncher;
    }

    public override async Task<int> ExecuteAsync(CommandContext context, WatchSettings settings)
    {
        var ct = _ctHolder.Token;

        var (configFile, buildConfig) = ResolveConfig(settings);
        var configDir = configFile is not null
            ? Path.GetDirectoryName(Path.GetFullPath(configFile))!
            : Directory.GetCurrentDirectory();

        var command = settings.Command ?? buildConfig?.Command;
        var cwd = settings.Cwd is not null
            ? Path.GetFullPath(settings.Cwd)
            : buildConfig?.Cwd is not null
                ? Path.GetFullPath(Path.Combine(configDir, buildConfig.Cwd))
                : configDir;

        if (command is null)
        {
            var hint = EntrypointDetector.SuggestBuildCommand(cwd);
            CliConsole.Error("build.command not configured in .flowconsole.yaml and --command not provided.");
            CliConsole.Info("");
            CliConsole.Info("Add to your .flowconsole.yaml:");
            CliConsole.Info("");
            CliConsole.Info("  build:");
            CliConsole.Info($"    {hint}");
            CliConsole.Info("");
            CliConsole.Info("Or use: fcon watch --command \"<your-command>\"");
            return 2;
        }

        if (!Directory.Exists(cwd))
        {
            CliConsole.Error($"working directory does not exist: {cwd}");
            return 2;
        }

        var snapshotPath = Path.Combine(configDir, ".flowconsole", "snapshots", "latest.json");

        var session = new WatchSession(token => RunBuild(command!, cwd, snapshotPath, token));

        RebuildResult initial;
        try
        {
            initial = await session.RunInitialAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            // Ctrl+C during the initial build: exit like a graceful session stop.
            session.Dispose();
            return 0;
        }

        if (!initial.Succeeded && !File.Exists(snapshotPath))
        {
            // Nothing to serve and nothing ever built — surface the error plainly.
            CliConsole.Error(initial.Error ?? "initial build failed.");
            session.Dispose();
            return 3;
        }
        if (!initial.Succeeded)
            CliConsole.Error(initial.Error ?? "initial build failed; showing last valid snapshot.");

        int port;
        try
        {
            port = PortAllocator.ResolvePortWithRetry(settings.Port);
        }
        catch (PortInUseException ex)
        {
            CliConsole.Error(ex.Message);
            session.Dispose();
            return 5;
        }
        catch (PortAccessDeniedException ex)
        {
            CliConsole.Error(ex.Message);
            session.Dispose();
            return 5;
        }
        catch (ArgumentOutOfRangeException ex)
        {
            CliConsole.Error(ex.Message);
            session.Dispose();
            return 4;
        }

        var host = StartHost(snapshotPath, settings, port, session, out var startError);
        if (host is null)
        {
            CliConsole.Error(startError!);
            session.Dispose();
            return 5;
        }

        using (host)
        using (var watcher = CreateSourceWatcher(cwd, settings.DebounceMs, session))
        {
            var url = $"http://127.0.0.1:{host.Port}";
            CliConsole.Info($"Watching {cwd} (Ctrl+C to stop)");
            CliConsole.Info($"Serving snapshot: {snapshotPath}");
            Console.Error.WriteLine($"Listening on {url}");

            if (!settings.NoOpen && !EnvironmentDetector.IsCI)
                _browserLauncher.TryOpen(url);

            try
            {
                await host.RunAsync(ct).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
            }
        }

        session.Dispose();
        return 0;
    }

    private (string? ConfigFile, ConfigDiscovery.BuildConfig? BuildConfig) ResolveConfig(WatchSettings settings)
    {
        var start = settings.Path is not null
            ? Path.GetFullPath(settings.Path)
            : Directory.GetCurrentDirectory();

        string? configFile;
        if (File.Exists(start) && string.Equals(Path.GetFileName(start), ConfigDiscovery.ConfigFileName, StringComparison.OrdinalIgnoreCase))
            configFile = start;
        else
            configFile = ConfigDiscovery.FindConfigFile(Directory.Exists(start) ? start : Path.GetDirectoryName(start)!);

        var buildConfig = configFile is not null ? ConfigDiscovery.ReadBuildConfig(configFile) : null;
        return (configFile, buildConfig);
    }

    private async Task<RebuildResult> RunBuild(string command, string cwd, string snapshotPath, CancellationToken ct)
    {
        int exitCode;
        string stdout;
        try
        {
            (exitCode, stdout) = await _shellRunner.RunAsync(command, cwd, ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            return RebuildResult.Fail($"build command failed to start: {ex.Message}");
        }

        if (ct.IsCancellationRequested)
            throw new OperationCanceledException(ct);

        if (exitCode == -1)
            return RebuildResult.Fail("build command output exceeded 10 MB limit.");

        if (exitCode != 0)
            return RebuildResult.Fail($"build command exited with code {exitCode}.");

        if (string.IsNullOrWhiteSpace(stdout))
            return RebuildResult.Fail("build command produced no output.");

        string normalized;
        try
        {
            normalized = SnapshotSerializer.Normalize(stdout);
        }
        catch (Exception ex)
        {
            return RebuildResult.Fail($"build output is not valid JSON: {ex.Message}");
        }

        await _atomicWriter.WriteAsync(snapshotPath, normalized, ct).ConfigureAwait(false);
        return RebuildResult.Ok();
    }

    private static IDisposable CreateSourceWatcher(string cwd, int debounceMs, WatchSession session)
    {
        var watcher = new FileSystemWatcher(cwd)
        {
            IncludeSubdirectories = true,
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.Size | NotifyFilters.CreationTime,
            EnableRaisingEvents = true,
        };

        Timer? debounce = null;
        var syncRoot = new object();

        void OnEvent(object sender, FileSystemEventArgs e)
        {
            if (!WatchFileFilter.ShouldTrigger(e.FullPath, cwd))
                return;

            lock (syncRoot)
            {
                var pending = new Timer(_ => session.RequestRebuild(), null, debounceMs, Timeout.Infinite);
                var old = Interlocked.Exchange(ref debounce, pending);
                old?.Dispose();
            }
        }

        watcher.Changed += OnEvent;
        watcher.Created += OnEvent;
        watcher.Renamed += OnEvent;
        watcher.Deleted += OnEvent;
        watcher.Error += (_, e) =>
            CliConsole.Info($"watcher error (continuing): {e.GetException().Message}");

        return new WatcherDisposable(watcher, () =>
        {
            lock (syncRoot)
            {
                debounce?.Dispose();
            }
        });
    }

    private static ViewerHost? StartHost(
        string snapshotPath,
        WatchSettings settings,
        int port,
        WatchSession session,
        out string? error)
    {
        bool isAutoPort = settings.Port is null or 0;

        for (var attempt = 0; ; attempt++)
        {
            var host = new ViewerHost(snapshotPath, settings.MaxSnapshotBytes, port,
                statusProvider: () =>
                {
                    var s = session.Status;
                    return (s.Version, s.State, s.LastError);
                });
            try
            {
                host.Start();
                error = null;
                return host;
            }
            catch (HttpListenerException) when (isAutoPort && attempt < AutoPortBindRetries)
            {
                host.Dispose();
                port = PortAllocator.FindEphemeralPort();
            }
            catch (HttpListenerException ex)
            {
                host.Dispose();
                error = ex.ErrorCode is 13 or 5
                    ? $"Access denied for port {port}. Ports below 1024 typically require elevated privileges."
                    : $"Port {port} is already in use. Try a different port or omit --port to auto-select.";
                return null;
            }
        }
    }

    private sealed record WatcherDisposable(FileSystemWatcher Watcher, Action DisposeTimer) : IDisposable
    {
        public void Dispose()
        {
            DisposeTimer();
            Watcher.Dispose();
        }
    }
}
