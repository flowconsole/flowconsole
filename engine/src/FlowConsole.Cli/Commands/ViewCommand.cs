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
            discovered = _discovery.Discover(settings.Path, settings.Source);
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
            port = PortAllocator.ResolvePort(settings.Port);
        }
        catch (PortInUseException ex)
        {
            CliConsole.Error(ex.Message);
            return 5;
        }

        var url = $"http://127.0.0.1:{port}";

        using var host = new ViewerHost(discovered.Path, settings.MaxSnapshotBytes, port);

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
            // Graceful shutdown via Ctrl-C
        }

        return 0;
    }
}
