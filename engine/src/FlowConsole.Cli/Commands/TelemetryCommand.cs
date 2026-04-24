using FlowConsole.Cli.Settings;
using FlowConsole.Cli.Telemetry;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class TelemetryOnSettings : GlobalSettings { }
internal sealed class TelemetryOffSettings : GlobalSettings { }

internal sealed class TelemetryStatusSettings : GlobalSettings { }

internal sealed class TelemetryOnCommand : Command<TelemetryOnSettings>
{
    private readonly TelemetryState _state;

    public TelemetryOnCommand(TelemetryState state)
    {
        _state = state;
    }

    public override int Execute(CommandContext context, TelemetryOnSettings settings)
    {
        _state.SetStatus("on");
        Console.Error.WriteLine("Telemetry enabled.");
        return 0;
    }
}

internal sealed class TelemetryOffCommand : Command<TelemetryOffSettings>
{
    private readonly TelemetryState _state;

    public TelemetryOffCommand(TelemetryState state)
    {
        _state = state;
    }

    public override int Execute(CommandContext context, TelemetryOffSettings settings)
    {
        _state.SetStatus("off");
        Console.Error.WriteLine("Telemetry disabled.");
        return 0;
    }
}

internal sealed class TelemetryStatusCommand : Command<TelemetryStatusSettings>
{
    private readonly TelemetryState _state;

    public TelemetryStatusCommand(TelemetryState state)
    {
        _state = state;
    }

    public override int Execute(CommandContext context, TelemetryStatusSettings settings)
    {
        var status = _state.GetStatus();
        Console.WriteLine($"Telemetry: {status}");
        Console.WriteLine($"Endpoint:  {TelemetryClient.PostHogEndpoint}");
        Console.WriteLine($"State:     {_state.StateFilePath}");

        // Environment overrides
        var envTelemetry = Environment.GetEnvironmentVariable("FLOWCONSOLE_TELEMETRY");
        if (envTelemetry is not null)
            Console.WriteLine($"FLOWCONSOLE_TELEMETRY={envTelemetry} (env override)");

        var doNotTrack = Environment.GetEnvironmentVariable("DO_NOT_TRACK");
        if (doNotTrack is not null)
            Console.WriteLine($"DO_NOT_TRACK={doNotTrack} (env override)");

        if (settings.Verbose)
        {
            Console.WriteLine();
            Console.Write(FirstRunBanner.Text);
        }

        return 0;
    }
}
