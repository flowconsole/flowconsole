using System.ComponentModel;
using System.Reflection;
using FlowConsole.Cli.Infrastructure;
using FlowConsole.Cli.Settings;
using Spectre.Console.Cli;

namespace FlowConsole.Cli.Commands;

internal sealed class CompletionSettings : GlobalSettings
{
    [CommandArgument(0, "<shell>")]
    [Description("Shell type: bash, zsh, fish, or pwsh")]
    public string Shell { get; init; } = "";
}

internal sealed class CompletionCommand : Command<CompletionSettings>
{
    private static readonly Dictionary<string, string> ShellResourceMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["bash"] = "FlowConsole.Cli.Resources.bash-completion.sh",
        ["zsh"] = "FlowConsole.Cli.Resources.zsh-completion.zsh",
        ["fish"] = "FlowConsole.Cli.Resources.fish-completion.fish",
        ["pwsh"] = "FlowConsole.Cli.Resources.pwsh-completion.ps1",
    };

    public override int Execute(CommandContext context, CompletionSettings settings)
    {
        var shell = settings.Shell.Trim().ToLowerInvariant();

        if (!ShellResourceMap.TryGetValue(shell, out var resourceName))
        {
            CliConsole.Info($"Unknown shell: {settings.Shell}");
            CliConsole.Info("Supported shells: bash, zsh, fish, pwsh");
            return 2;
        }

        var assembly = typeof(CompletionCommand).Assembly;
        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            CliConsole.Info($"Completion script not found for {shell}");
            return 5;
        }

        using var reader = new StreamReader(stream);
        Console.Write(reader.ReadToEnd());
        return 0;
    }
}
