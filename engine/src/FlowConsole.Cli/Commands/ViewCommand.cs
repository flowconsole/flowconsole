using System.Net;
using System.Text.Json;
using FlowConsole.Cli.Hosting;
using FlowConsole.Cli.Infrastructure;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class ViewCommand : AsyncCommand<ViewSettings>
{
    private readonly SnapshotDiscovery _discovery;
    private readonly SnapshotStartupValidator _validator;
    private readonly BrowserLauncher _browserLauncher;
    private readonly CancellationTokenHolder _ctHolder;

    public ViewCommand(
        SnapshotDiscovery discovery,
        SnapshotStartupValidator validator,
        BrowserLauncher browserLauncher,
        CancellationTokenHolder ctHolder)
    {
        _discovery = discovery;
        _validator = validator;
        _browserLauncher = browserLauncher;
        _ctHolder = ctHolder;
    }

    public override async Task<int> ExecuteAsync(CommandContext context, ViewSettings settings)
    {
        var ct = _ctHolder.Token;

        DiscoveryResult discovered;
        try
        {
            discovered = _discovery.Discover(settings.Path, settings.Source, settings.MaxSnapshotBytes);
        }
        catch (FileNotFoundException ex)
        {
            CliConsole.Error(ex.Message);
            return 2;
        }
        catch (SnapshotsNotFoundException ex)
        {
            CliConsole.Error(ex.Message);
            return 6;
        }
        catch (SourceFilterEmptyException ex)
        {
            CliConsole.Error(ex.Message);
            return 6;
        }
        catch (JsonException ex)
        {
            CliConsole.Error($"Snapshot JSON is malformed: {ex.Message}");
            return 7;
        }
        catch (SnapshotTooLargeException ex)
        {
            CliConsole.Error($"Snapshot file too large: {ex.Message}");
            return 7;
        }
        catch (InvalidOperationException ex)
        {
            CliConsole.Error(ex.Message);
            return 7;
        }

        try
        {
            _validator.ValidateAndLoad(discovered.Path, settings.MaxSnapshotBytes);
        }
        catch (FileNotFoundException ex)
        {
            CliConsole.Error(ex.Message);
            return 2;
        }
        catch (InvalidOperationException ex)
        {
            CliConsole.Error(ex.Message);
            return 7;
        }

        int port;
        try
        {
            port = PortAllocator.ResolvePortWithRetry(settings.Port);
        }
        catch (PortInUseException ex)
        {
            CliConsole.Error(ex.Message);
            return 5;
        }
        catch (PortAccessDeniedException ex)
        {
            CliConsole.Error(ex.Message);
            return 5;
        }
        catch (ArgumentOutOfRangeException ex)
        {
            CliConsole.Error(ex.Message);
            return 4;
        }

        var host = StartHost(discovered.Path, settings, port, out var startError);
        if (host is null)
        {
            CliConsole.Error(startError!);
            return 5;
        }

        using (host)
        {
            var url = $"http://127.0.0.1:{host.Port}";

            CliConsole.Info($"Serving snapshot: {discovered.Path}");
            CliConsole.Info($"Source: {discovered.Source}, Elements: {discovered.ElementCount}");
            Console.Error.WriteLine($"Listening on {url}");
            CliConsole.Hint("Press Ctrl+C to stop");

            if (!settings.NoOpen && !EnvironmentDetector.IsCI)
                _browserLauncher.TryOpen(url);

            try
            {
                await host.RunAsync(ct);
            }
            catch (OperationCanceledException)
            {
            }

            return 0;
        }
    }

    private const int AutoPortBindRetries = 3;

    private static ViewerHost? StartHost(string snapshotPath, ViewSettings settings, int port, out string? error)
    {
        bool isAutoPort = settings.Port is null or 0;

        for (var attempt = 0; ; attempt++)
        {
            var host = new ViewerHost(snapshotPath, settings.MaxSnapshotBytes, port);
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
                if (isAutoPort)
                {
                    error = $"Could not bind to auto-selected port {port} after {AutoPortBindRetries + 1} attempts. Please specify a port with --port.";
                }
                else
                {
                    // ErrorCode 13 = EACCES (Linux), 5 = ERROR_ACCESS_DENIED (Windows)
                    error = ex.ErrorCode is 13 or 5
                        ? $"Access denied for port {port}. Ports below 1024 typically require elevated privileges."
                        : $"Port {port} is already in use. Try a different port or omit --port to auto-select.";
                }
                return null;
            }
        }
    }
}
