using System.Reflection;
using FlowConsole.Cli.Settings;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class VersionCommand : Command<GlobalSettings>
{
    public override int Execute(CommandContext context, GlobalSettings settings)
    {
        var version = GetVersion();
        Console.WriteLine(version);
        return 0;
    }

    internal static string GetVersion()
    {
        var assembly = typeof(VersionCommand).Assembly;
        var infoVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;

        if (infoVersion is not null)
        {
            var plusIndex = infoVersion.IndexOf('+', StringComparison.Ordinal);
            return plusIndex >= 0 ? infoVersion[..plusIndex] : infoVersion;
        }

        return assembly.GetName().Version?.ToString(3) ?? "0.0.0";
    }
}
